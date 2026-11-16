package ma.aui.darija.rest;

import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import ma.aui.darija.service.TranslationService;

import java.util.LinkedHashMap;
import java.util.Map;

/** Public (unauthenticated) liveness check: GET /api/health. Clients use it to test the server URL. */
@Path("/health")
@RequestScoped
public class HealthResource {

    @Inject
    private TranslationService translationService;

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Map<String, String> health() {
        Map<String, String> status = new LinkedHashMap<>();
        status.put("status", "UP");
        status.put("service", "darija-translator");
        status.put("provider", translationService.provider());
        status.put("model", translationService.model());
        return status;
    }
}
