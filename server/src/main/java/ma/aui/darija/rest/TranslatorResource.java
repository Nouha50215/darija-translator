package ma.aui.darija.rest;

import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.SecurityContext;
import ma.aui.darija.llm.LlmException;
import ma.aui.darija.model.TranslationRequest;
import ma.aui.darija.model.TranslationResponse;
import ma.aui.darija.service.TranslationService;

import java.util.logging.Logger;

/**
 * The RESTful endpoint required by the assignment.
 * <p>
 * Protected by HTTP Basic authentication (see web.xml and
 * {@link ma.aui.darija.security.SecurityConfig}): only callers in the
 * {@code translator} role get here.
 *
 * <pre>
 * POST /api/translate          body: {"text":"Good morning","script":"arabic"}
 * GET  /api/translate?text=Good%20morning&amp;script=latin
 * </pre>
 */
@Path("/translate")
@RequestScoped
@Produces(MediaType.APPLICATION_JSON + ";charset=UTF-8")
public class TranslatorResource {

    private static final Logger LOG = Logger.getLogger(TranslatorResource.class.getName());

    @Inject
    private TranslationService translationService;

    @Context
    private SecurityContext securityContext;

    /** Business method: accepts a text and returns its Darija translation. */
    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public TranslationResponse translate(TranslationRequest request) throws LlmException {
        String user = securityContext.getUserPrincipal() == null
                ? "?" : securityContext.getUserPrincipal().getName();
        LOG.fine(() -> "translate() called by " + user);
        return translationService.translate(request);
    }

    /** Same business method exposed as GET, handy for a browser or a quick cURL. */
    @GET
    public TranslationResponse translate(@QueryParam("text") String text,
                                         @QueryParam("sourceLanguage") String sourceLanguage,
                                         @QueryParam("script") String script) throws LlmException {
        return translate(new TranslationRequest(text, sourceLanguage, script));
    }
}
