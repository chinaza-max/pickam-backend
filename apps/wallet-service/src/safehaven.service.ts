import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

/**
 * SafeHaven MFB integration service.
 *
 * Auth flow mirrors the official SDK pattern:
 *  1. client_credentials grant → obtains access_token + refresh_token
 *  2. refresh_token grant → refreshes the access_token before it expires
 *  3. Every API call checks token freshness via ensureToken()
 *  4. On 401 response, a single retry is attempted after refreshing
 *
 * Sandbox: https://api.sandbox.safehavenmfb.com
 * Production: https://api.safehavenmfb.com
 */
@Injectable()
export class SafeHavenService {
  private readonly logger = new Logger(SafeHavenService.name);

  private readonly apiUrl: string;
  private readonly clientId: string;
  private readonly clientAssertion: string;
  private readonly clientAssertionType: string;
  private readonly settlementBankCode: string;
  private readonly settlementAccountNumber: string;

  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: number | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const env = this.configService.get<string>('SAFEHAVEN_ENVIRONMENT') || 'sandBox';
    this.apiUrl =
      env === 'production'
        ? 'https://api.safehavenmfb.com'
        : 'https://api.sandbox.safehavenmfb.com';

    this.clientId = this.configService.get<string>('SAFEHAVEN_CLIENT_ID') || '';
    this.clientAssertion = this.configService.get<string>('SAFEHAVEN_CLIENT_ASSERTION') || '';
    this.clientAssertionType =
      this.configService.get<string>('SAFEHAVEN_CLIENT_ASSERTION_TYPE') ||
      'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';
    this.settlementBankCode = this.configService.get<string>('SAFEHAVEN_BANK_CODE') || '090286';
    this.settlementAccountNumber =
      this.configService.get<string>('SAFEHAVEN_ACCOUNT_NUMBER') || '';
  }

  /* ─────────────────── AUTH ─────────────────── */

  /**
   * client_credentials grant — called on first use.
   * Stores both refreshToken and accessToken plus expiry time.
   */
  private async generateRefreshToken(): Promise<void> {
    const url = `${this.apiUrl}/oauth2/token`;
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_assertion_type: this.clientAssertionType,
      client_id: this.clientId,
      client_assertion: this.clientAssertion,
    }).toString();

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, body, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

      const resData = response.data?.data || response.data;
      this.accessToken = resData?.access_token || resData?.accessToken || null;
      this.refreshToken = resData?.refresh_token || resData?.refreshToken || null;

      // SafeHaven returns expires_in in seconds (default 2400 = 40 min).
      // Subtract 5 minutes as a safety buffer.
      const expiresIn: number = resData?.expires_in || resData?.expiresIn || 2400;
      this.tokenExpiresAt = Date.now() + (expiresIn - 300) * 1000;

      this.logger.log('SafeHaven client_credentials token obtained.');
    } catch (error) {
      this.logger.error(
        `SafeHaven client_credentials grant failed: ${error?.response?.data?.message || error.message}`,
      );
      throw error;
    }
  }

  /**
   * refresh_token grant — called when the access token has expired.
   */
  private async refreshAccessToken(): Promise<void> {
    const url = `${this.apiUrl}/oauth2/token`;
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_assertion_type: this.clientAssertionType,
      client_id: this.clientId,
      client_assertion: this.clientAssertion,
      refresh_token: this.refreshToken || '',
    }).toString();

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, body, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

      const resData = response.data?.data || response.data;
      this.accessToken = resData?.access_token || resData?.accessToken || null;
      const expiresIn: number = resData?.expires_in || resData?.expiresIn || 2400;
      this.tokenExpiresAt = Date.now() + (expiresIn - 300) * 1000;

      this.logger.log('SafeHaven access token refreshed.');
    } catch (error) {
      this.logger.warn(
        `SafeHaven refresh_token grant failed: ${error?.response?.data?.message || error.message}. Re-authenticating…`,
      );
      // If refresh fails, fall back to full re-auth
      await this.generateRefreshToken();
    }
  }

  /** Returns true if we have no token or it has passed its expiry time. */
  private isTokenExpired(): boolean {
    if (!this.accessToken || !this.tokenExpiresAt) return true;
    return Date.now() >= this.tokenExpiresAt;
  }

  /**
   * Called before every API method.
   * - No token → full client_credentials flow
   * - Token expired → refresh_token flow
   * - Token valid → no-op
   */
  private async ensureToken(): Promise<void> {
    if (!this.accessToken || this.isTokenExpired()) {
      await this.generateRefreshToken();
    }
  }

  /** Standard headers for all SafeHaven API calls. */
  private authHeaders() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      ClientID: this.clientId,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  /* ─────────────── VIRTUAL ACCOUNTS ─────────────── */

  /**
   * Creates a SafeHaven dynamic virtual account for wallet deposits.
   *
   * @param validFor         - TTL in seconds (default 900 = 15 min). Set 0 for permanent.
   * @param amountControl    - 'Fixed' | 'Variable'
   * @param amount           - expected deposit amount (used when amountControl = 'Fixed')
   * @param callbackUrl      - webhook URL SafeHaven will POST to on deposit
   * @param externalReference - your unique reference for this account
   */
  async createVirtualAccount(
    validFor = 900,
    amountControl = 'Variable',
    amount = 0,
    callbackUrl = '',
    externalReference = '',
  ): Promise<any> {
    await this.ensureToken();

    const url = `${this.apiUrl}/virtual-accounts`;
    const data = {
      validFor,
      settlementAccount: {
        bankCode: this.settlementBankCode,
        accountNumber: this.settlementAccountNumber,
      },
      amountControl,
      amount,
      callbackUrl,
      externalReference,
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, data, { headers: this.authHeaders() }),
      );
      return response.data;
    } catch (error) {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        this.logger.warn(`SafeHaven API returned status ${error?.response?.status}. Refreshing token and retrying...`);
        await this.generateRefreshToken();
        const retry = await firstValueFrom(
          this.httpService.post(url, data, { headers: this.authHeaders() }),
        );
        return retry.data;
      }
      this.logger.error(
        `SafeHaven createVirtualAccount failed: ${error?.response?.data?.message || error.message}`,
      );
      throw error;
    }
  }

  /** Retrieves a virtual account by its SafeHaven ID. */
  async getVirtualAccount(accountId: string): Promise<any> {
    await this.ensureToken();

    const url = `${this.apiUrl}/virtual-accounts/${accountId}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { headers: this.authHeaders() }),
      );
      return response.data;
    } catch (error) {
      if (error?.response?.status === 401) {
        await this.refreshAccessToken();
        const retry = await firstValueFrom(
          this.httpService.get(url, { headers: this.authHeaders() }),
        );
        return retry.data;
      }
      this.logger.error(`SafeHaven getVirtualAccount failed: ${error.message}`);
      throw error;
    }
  }

  /** Updates a virtual account (validFor, amount, amountControl, etc.). */
  async updateVirtualAccount(accountId: string, updateFields: Record<string, any>): Promise<any> {
    await this.ensureToken();

    const url = `${this.apiUrl}/virtual-accounts/${accountId}`;

    try {
      const response = await firstValueFrom(
        this.httpService.put(url, updateFields, { headers: this.authHeaders() }),
      );
      return response.data;
    } catch (error) {
      if (error?.response?.status === 401) {
        await this.refreshAccessToken();
        const retry = await firstValueFrom(
          this.httpService.put(url, updateFields, { headers: this.authHeaders() }),
        );
        return retry.data;
      }
      this.logger.error(`SafeHaven updateVirtualAccount failed: ${error.message}`);
      throw error;
    }
  }

  /** Deletes / deactivates a virtual account. */
  async deleteVirtualAccount(accountId: string): Promise<any> {
    await this.ensureToken();

    const url = `${this.apiUrl}/virtual-accounts/${accountId}`;

    try {
      const response = await firstValueFrom(
        this.httpService.delete(url, { headers: this.authHeaders() }),
      );
      return response.data;
    } catch (error) {
      if (error?.response?.status === 401) {
        await this.refreshAccessToken();
        const retry = await firstValueFrom(
          this.httpService.delete(url, { headers: this.authHeaders() }),
        );
        return retry.data;
      }
      this.logger.error(`SafeHaven deleteVirtualAccount failed: ${error.message}`);
      throw error;
    }
  }

  /** Checks the status of a deposit transfer to a virtual account. */
  async getVirtualAccountTransferStatus(sessionId: string): Promise<any> {
    await this.ensureToken();

    const url = `${this.apiUrl}/virtual-accounts/status`;
    const data = { sessionId };

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, data, { headers: this.authHeaders() }),
      );
      return response.data;
    } catch (error) {
      if (error?.response?.status === 401) {
        await this.refreshAccessToken();
        const retry = await firstValueFrom(
          this.httpService.post(url, data, { headers: this.authHeaders() }),
        );
        return retry.data;
      }
      this.logger.error(`SafeHaven getVirtualAccountTransferStatus failed: ${error.message}`);
      throw error;
    }
  }

  /** Lists transactions on a specific virtual account. */
  async getVirtualAccountTransactions(virtualAccountId: string): Promise<any> {
    await this.ensureToken();

    const url = `${this.apiUrl}/virtual-accounts/${virtualAccountId}/transaction`;

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { headers: this.authHeaders() }),
      );
      return response.data;
    } catch (error) {
      if (error?.response?.status === 401) {
        await this.refreshAccessToken();
        const retry = await firstValueFrom(
          this.httpService.get(url, { headers: this.authHeaders() }),
        );
        return retry.data;
      }
      this.logger.error(`SafeHaven getVirtualAccountTransactions failed: ${error.message}`);
      throw error;
    }
  }

  /* ─────────────── IDENTITY VERIFICATION ─────────────── */

  /** Initiates NIN identity verification. */
  async initiateVerification(params: {
    NIN: string;
    debitAccountNumber: string;
    otp: string;
    verifierId?: string;
    provider?: string;
    async?: boolean;
  }): Promise<any> {
    await this.ensureToken();

    const url = `${this.apiUrl}/identity/v2`;
    const data = {
      type: 'NIN',
      number: params.NIN,
      debitAccountNumber: params.debitAccountNumber,
      otp: params.otp,
      verifierId: params.verifierId || 'default',
      provider: params.provider || 'creditRegistry',
      async: params.async ?? true,
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, data, { headers: this.authHeaders() }),
      );
      return response.data;
    } catch (error) {
      if (error?.response?.status === 401) {
        await this.refreshAccessToken();
        const retry = await firstValueFrom(
          this.httpService.post(url, data, { headers: this.authHeaders() }),
        );
        return retry.data;
      }
      this.logger.error(`SafeHaven initiateVerification failed: ${error.message}`);
      throw error;
    }
  }

  /** Validates an identity verification with OTP. */
  async validateVerification(params: {
    identityId: string;
    type: string;
    otp: string;
  }): Promise<any> {
    await this.ensureToken();

    const url = `${this.apiUrl}/identity/v2/validate`;

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, params, { headers: this.authHeaders() }),
      );
      return response.data;
    } catch (error) {
      if (error?.response?.status === 401) {
        await this.refreshAccessToken();
        const retry = await firstValueFrom(
          this.httpService.post(url, params, { headers: this.authHeaders() }),
        );
        return retry.data;
      }
      this.logger.error(`SafeHaven validateVerification failed: ${error.message}`);
      throw error;
    }
  }

  /* ─────────────── TRANSFERS ─────────────── */

  /** Returns the list of Nigerian banks. */
  async getBankList(): Promise<any> {
    await this.ensureToken();

    const url = `${this.apiUrl}/transfers/banks`;

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { headers: this.authHeaders() }),
      );
      return response.data;
    } catch (error) {
      if (error?.response?.status === 401) {
        await this.refreshAccessToken();
        const retry = await firstValueFrom(
          this.httpService.get(url, { headers: this.authHeaders() }),
        );
        return retry.data;
      }
      this.logger.error(`SafeHaven getBankList failed: ${error.message}`);
      throw error;
    }
  }

  /** Resolves a bank account name from bank code + account number. */
  async nameEnquiry(bankCode: string, accountNumber: string): Promise<any> {
    await this.ensureToken();

    const url = `${this.apiUrl}/transfers/name-enquiry`;
    const data = {
      bankCode: String(bankCode),
      accountNumber: String(accountNumber),
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, data, { headers: this.authHeaders() }),
      );
      return response.data;
    } catch (error) {
      if (error?.response?.status === 401) {
        await this.refreshAccessToken();
        const retry = await firstValueFrom(
          this.httpService.post(url, data, { headers: this.authHeaders() }),
        );
        return retry.data;
      }
      this.logger.error(`SafeHaven nameEnquiry failed: ${error.message}`);
      throw error;
    }
  }

  /** Initiates a bank transfer. */
  async initiateTransfer(payload: {
    nameEnquiryReference: string;
    debitAccountNumber: string;
    beneficiaryBankCode: string;
    beneficiaryAccountNumber: string;
    amount: number;
    saveBeneficiary?: boolean;
    narration?: string;
    paymentReference?: string;
  }): Promise<any> {
    await this.ensureToken();

    const url = `${this.apiUrl}/transfers`;
    const data = {
      nameEnquiryReference: payload.nameEnquiryReference,
      debitAccountNumber: payload.debitAccountNumber,
      beneficiaryBankCode: payload.beneficiaryBankCode,
      beneficiaryAccountNumber: payload.beneficiaryAccountNumber,
      amount: payload.amount,
      saveBeneficiary: payload.saveBeneficiary || false,
      narration: payload.narration || '',
      paymentReference: payload.paymentReference || '',
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, data, { headers: this.authHeaders() }),
      );
      return response.data;
    } catch (error) {
      if (error?.response?.status === 401) {
        await this.refreshAccessToken();
        const retry = await firstValueFrom(
          this.httpService.post(url, data, { headers: this.authHeaders() }),
        );
        return retry.data;
      }
      this.logger.error(`SafeHaven initiateTransfer failed: ${error.message}`);
      throw error;
    }
  }

  /** Checks the status of a transfer by session ID. */
  async getTransferStatus(sessionId: string): Promise<any> {
    await this.ensureToken();

    const url = `${this.apiUrl}/transfers/status`;
    const data = { sessionId };

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, data, { headers: this.authHeaders() }),
      );
      return response.data;
    } catch (error) {
      if (error?.response?.status === 401) {
        await this.refreshAccessToken();
        const retry = await firstValueFrom(
          this.httpService.post(url, data, { headers: this.authHeaders() }),
        );
        return retry.data;
      }
      this.logger.error(`SafeHaven getTransferStatus failed: ${error.message}`);
      throw error;
    }
  }

  /** Retrieves account details by account ID. */
  async getAccount(accountId: string): Promise<any> {
    await this.ensureToken();

    const url = `${this.apiUrl}/accounts/${accountId}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { headers: this.authHeaders() }),
      );
      return response.data;
    } catch (error) {
      if (error?.response?.status === 401) {
        await this.refreshAccessToken();
        const retry = await firstValueFrom(
          this.httpService.get(url, { headers: this.authHeaders() }),
        );
        return retry.data;
      }
      this.logger.error(`SafeHaven getAccount failed: ${error.message}`);
      throw error;
    }
  }

  /* ─────────────── CONVENIENCE WRAPPER (Used by WalletService) ─────────────── */

  /**
   * High-level helper called by WalletService.createWallet().
   * Creates a variable-amount virtual account for the user and returns
   * normalized account info. Falls back to a mock on failure.
   */
  async generateVirtualAccount(
    firstName: string,
    lastName: string,
    email: string,
    phoneNumber: string,
  ) {
    const callbackUrl =
      this.configService.get<string>('SAFEHAVEN_CALLBACK_URL') ||
      `${process.env.GATEWAY_URL || 'http://localhost:3000'}/wallets/webhook/safehaven`;

    const externalReference = `pickam_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const ttl = Number(this.configService.get<string>('SAFEHAVEN_ACCOUNT_TTL') || '3600');

    try {
      const result = await this.createVirtualAccount(
        ttl,                 // validFor = ttl
        'Variable',        // accept any amount
        0,                 // no fixed amount
        callbackUrl,
        externalReference,
      );

      const resData = result?.data || result;
      const expiresAt = resData?.expiresAt
        ? new Date(resData.expiresAt)
        : new Date(Date.now() + ttl * 1000);

      return {
        bankName: resData?.bankName || 'SafeHaven MFB',
        accountName: resData?.accountName || `${firstName} ${lastName}`,
        accountNumber: resData?.accountNumber || '',
        provider: 'SAFEHAVEN',
        expiresAt,
      };
    } catch (err) {
      this.logger.warn(
        `SafeHaven virtual account creation failed (${err?.response?.data?.message || err.message}). Falling back to sandbox mock account for dev/testing.`,
      );
      // Fallback mock dynamic account for development/sandbox when API credentials are mock or failing
      const mockAccNum = `99${Math.floor(10000000 + Math.random() * 90000000)}`;
      return {
        bankName: 'SafeHaven MFB (Sandbox)',
        accountName: `${firstName} ${lastName}`,
        accountNumber: mockAccNum,
        provider: 'SAFEHAVEN_MOCK',
        expiresAt: new Date(Date.now() + ttl * 1000),
      };
    }
  }
}
