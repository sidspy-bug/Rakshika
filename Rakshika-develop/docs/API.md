# API Documentation

This document indexes the OpenAPI source-of-truth files used by the frontend and backend teams.

Every service specification includes:

- Endpoints
- Request and response models
- Authentication rules
- Validation rules
- Error codes
- Pagination behavior
- Rate limiting
- OpenAPI-ready structure

## OpenAPI Specs

- [Auth Service](../openapi/auth-service.yaml)
- [User Service](../openapi/user-service.yaml)
- [Emergency Service](../openapi/emergency-service.yaml)
- [Community Service](../openapi/community-service.yaml)
- [Location Service](../openapi/location-service.yaml)
- [Notification Service](../openapi/notification-service.yaml)
- [Evidence Service](../openapi/evidence-service.yaml)
- [AI Service](../openapi/ai-service.yaml)
- [Common Components](../openapi/common.yaml)

## Shared API Conventions

- Base path: `/api/v1`
- Auth: `Authorization: Bearer <JWT>` for protected endpoints
- Content type: `application/json`
- Standard error shape: `{ "error": { "code": string, "message": string, "details"?: object } }`
- Standard pagination shape: `{ "items": [], "page": number, "pageSize": number, "total": number, "hasNext": boolean }`

The OpenAPI files define the exact request and response contracts.
