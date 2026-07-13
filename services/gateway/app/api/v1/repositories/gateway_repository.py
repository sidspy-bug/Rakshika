"""Downstream HTTP forwarding repository."""

from __future__ import annotations

from dataclasses import dataclass

import httpx

from ...core.proxy import ProxyRequest, ProxyResponse, filter_response_headers


@dataclass(slots=True)
class GatewayRepository:
    """Encapsulates downstream HTTP forwarding."""

    client: httpx.AsyncClient

    async def forward(self, request_data: ProxyRequest) -> ProxyResponse:
        """Forward a request to a downstream service."""

        response = await self.client.request(
            method=request_data.method,
            url=request_data.url,
            headers=request_data.headers,
            content=request_data.body,
        )
        return ProxyResponse(
            status_code=response.status_code,
            headers=filter_response_headers(response.headers),
            body=response.content,
        )
