import {
  Controller,
  Get,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import { AdminServiceService } from './admin-service.service';
import {
  GetStateByCoordinatesDto,
  GetZonesByStateDto,
  GetLandmarksByZoneDto,
} from './dto/admin.dto';
import { Public } from 'libs/decorators';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiProduces } from '@nestjs/swagger';

const STATE_BY_COORDINATES_RESPONSE = {
  status: 200,
  description: 'Reverse geocoded location metadata and matched database State record',
  schema: {
    example: {
      success: true,
      coordinates: { latitude: 6.5244, longitude: 3.3792 },
      geocoded: {
        rawState: 'Lagos State',
        cleanedStateName: 'Lagos',
        isoCode: 'NG-LA',
        stateCode: 'LA',
        displayName: 'Tizeti HQ Test Address, Eletu Odibo Street, Akoka, Shomolu, Lagos State, 102216, Nigeria',
        address: {
          amenity: 'Tizeti HQ Test Address',
          road: 'Eletu Odibo Street',
          residential: 'Akoka',
          suburb: 'Akoka',
          county: 'Shomolu',
          state: 'Lagos State',
          'ISO3166-2-lvl4': 'NG-LA',
          postcode: '102216',
          country: 'Nigeria',
          country_code: 'ng'
        }
      },
      matchedState: {
        id: '0c3c416a-14a9-4fa3-8dd6-b19f9464944b',
        name: 'Lagos',
        code: 'LA',
        status: 'ACTIVE',
        activeZonesCount: 1,
        zones: [
          { id: 'zone-uuid-1', name: 'Ikeja', basePrice: 500, status: 'ACTIVE' }
        ]
      }
    }
  }
};

const ZONES_BY_STATE_RESPONSE = {
  status: 200,
  description: 'List of active delivery zones in the specified state',
  schema: {
    example: {
      success: true,
      state: {
        id: 'db05d24f-0f06-4bb2-9cbd-f1d7f3d792aa',
        name: 'Kaduna',
        code: 'KD',
        status: 'ACTIVE'
      },
      totalZones: 1,
      zones: [
        {
          id: '028798e0-4dd5-4890-8f97-61111625e375',
          name: 'gwagwalada',
          stateId: 'db05d24f-0f06-4bb2-9cbd-f1d7f3d792aa',
          basePrice: 3000,
          status: 'ACTIVE',
          landmarksCount: 1,
          createdAt: '2026-08-06T00:40:20.002Z',
          updatedAt: '2026-08-06T17:37:20.819Z'
        }
      ]
    }
  }
};

const LANDMARKS_BY_ZONE_RESPONSE = {
  status: 200,
  description: 'List of registered landmarks within the specified zone',
  schema: {
    example: {
      success: true,
      zone: {
        id: '4adcca41-7d8d-481a-b8cf-b7162a35c9d4',
        name: 'kubwa',
        basePrice: 1500,
        status: 'ACTIVE',
        state: {
          id: 'c3e1b767-ea54-4ba1-8e12-138080f808ef',
          name: 'Abuja Federal Capital Territory',
          code: 'FC'
        }
      },
      totalLandmarks: 2,
      landmarks: [
        {
          id: '690cf7f3-053a-46f4-9163-055263999ebf',
          name: 'firstbank',
          zoneId: '4adcca41-7d8d-481a-b8cf-b7162a35c9d4',
          createdAt: '2026-08-06T00:04:43.116Z',
          updatedAt: '2026-08-06T00:04:43.116Z'
        },
        {
          id: '10038e5d-a6ab-4ce8-9980-a7bbd5e165d1',
          name: 'kfc',
          zoneId: '4adcca41-7d8d-481a-b8cf-b7162a35c9d4',
          createdAt: '2026-08-06T00:05:34.996Z',
          updatedAt: '2026-08-06T00:05:34.996Z'
        }
      ]
    }
  }
};

@ApiTags('User Location & Geocoding')
@Controller('locations')
export class LocationController {
  constructor(private readonly adminService: AdminServiceService) {}

  @Public()
  @Get('state-by-coordinates')
  @ApiProduces('application/json')
  @ApiOperation({
    summary: 'Public: Reverse geocode coordinates (lat & lng) to get state via Nominatim',
  })
  @ApiQuery({ name: 'latitude', required: false, example: 6.5244, description: 'Latitude coordinate' })
  @ApiQuery({ name: 'longitude', required: false, example: 3.3792, description: 'Longitude coordinate' })
  @ApiQuery({ name: 'lat', required: false, example: 6.5244 })
  @ApiQuery({ name: 'lng', required: false, example: 3.3792 })
  @ApiQuery({ name: 'lon', required: false, example: 3.3792 })
  @ApiResponse(STATE_BY_COORDINATES_RESPONSE)
  @ApiResponse({ status: 400, description: 'Bad Request — Missing or invalid latitude/longitude parameters' })
  async getStateByCoordinatesGet(@Query() query: GetStateByCoordinatesDto) {
    return this.adminService.getStateByCoordinates(query);
  }

  @Public()
  @Post('state-by-coordinates')
  @ApiProduces('application/json')
  @ApiOperation({
    summary: 'Public: Reverse geocode coordinates (lat & lng) to get state via Nominatim (POST Body)',
  })
  @ApiResponse(STATE_BY_COORDINATES_RESPONSE)
  @ApiResponse({ status: 400, description: 'Bad Request — Missing or invalid latitude/longitude parameters' })
  async getStateByCoordinatesPost(@Body() dto: GetStateByCoordinatesDto) {
    return this.adminService.getStateByCoordinates(dto);
  }

  @Public()
  @Get('zones-by-state')
  @ApiProduces('application/json')
  @ApiOperation({
    summary: 'Public: Get all delivery zones in a state by stateId or state name',
  })
  @ApiQuery({ name: 'stateId', required: false, example: 'state-uuid-1234' })
  @ApiQuery({ name: 'state', required: false, example: 'Lagos' })
  @ApiQuery({ name: 'stateName', required: false, example: 'Lagos' })
  @ApiResponse(ZONES_BY_STATE_RESPONSE)
  @ApiResponse({ status: 404, description: 'Not Found — State does not exist in database' })
  async getZonesByStateGet(@Query() query: GetZonesByStateDto) {
    return this.adminService.getZonesByState(query);
  }

  @Public()
  @Post('zones-by-state')
  @ApiProduces('application/json')
  @ApiOperation({
    summary: 'Public: Get all delivery zones in a state by stateId or state name (POST Body)',
  })
  @ApiResponse(ZONES_BY_STATE_RESPONSE)
  @ApiResponse({ status: 404, description: 'Not Found — State does not exist in database' })
  async getZonesByStatePost(@Body() dto: GetZonesByStateDto) {
    return this.adminService.getZonesByState(dto);
  }

  @Public()
  @Get('landmarks-by-zone')
  @ApiProduces('application/json')
  @ApiOperation({
    summary: 'Public: Get all landmarks within a delivery zone by zoneId or zone name',
  })
  @ApiQuery({ name: 'zoneId', required: false, example: 'zone-uuid-1234' })
  @ApiQuery({ name: 'zone', required: false, example: 'Ikeja' })
  @ApiQuery({ name: 'zoneName', required: false, example: 'Ikeja' })
  @ApiResponse(LANDMARKS_BY_ZONE_RESPONSE)
  @ApiResponse({ status: 404, description: 'Not Found — Zone does not exist in database' })
  async getLandmarksByZoneGet(@Query() query: GetLandmarksByZoneDto) {
    return this.adminService.getLandmarksByZone(query);
  }

  @Public()
  @Post('landmarks-by-zone')
  @ApiProduces('application/json')
  @ApiOperation({
    summary: 'Public: Get all landmarks within a delivery zone by zoneId or zone name (POST Body)',
  })
  @ApiResponse(LANDMARKS_BY_ZONE_RESPONSE)
  @ApiResponse({ status: 404, description: 'Not Found — Zone does not exist in database' })
  async getLandmarksByZonePost(@Body() dto: GetLandmarksByZoneDto) {
    return this.adminService.getLandmarksByZone(dto);
  }
}
