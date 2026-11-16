package ma.aui.darija.rest;

import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerResponseContext;
import jakarta.ws.rs.container.ContainerResponseFilter;
import jakarta.ws.rs.core.MultivaluedMap;
import jakarta.ws.rs.ext.Provider;

/**
 * Adds CORS headers so browser-based clients (web pages, the React Native web
 * build) can call the API. The Chrome extension doesn't need this because it
 * declares host_permissions, but it doesn't hurt.
 */
@Provider
public class CorsFilter implements ContainerResponseFilter {

    @Override
    public void filter(ContainerRequestContext request, ContainerResponseContext response) {
        MultivaluedMap<String, Object> headers = response.getHeaders();
        String origin = request.getHeaderString("Origin");
        headers.putSingle("Access-Control-Allow-Origin", origin != null ? origin : "*");
        headers.putSingle("Vary", "Origin");
        headers.putSingle("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        headers.putSingle("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept");
        headers.putSingle("Access-Control-Allow-Credentials", "true");
        headers.putSingle("Access-Control-Max-Age", "3600");
    }
}
