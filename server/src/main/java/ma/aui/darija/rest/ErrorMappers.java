package ma.aui.darija.rest;

import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;
import ma.aui.darija.llm.LlmException;
import ma.aui.darija.model.ErrorResponse;
import ma.aui.darija.service.InvalidTranslationRequestException;

import java.util.logging.Level;
import java.util.logging.Logger;

/** Turns exceptions into consistent JSON error responses. */
public final class ErrorMappers {

    private static final Logger LOG = Logger.getLogger(ErrorMappers.class.getName());

    private ErrorMappers() {
    }

    static Response json(Response.Status status, String message) {
        return Response.status(status)
                .type(MediaType.APPLICATION_JSON_TYPE.withCharset("UTF-8"))
                .entity(new ErrorResponse(status.getStatusCode(), status.getReasonPhrase(), message))
                .build();
    }

    /** 400 - the client sent bad input. */
    @Provider
    public static class InvalidRequestMapper implements ExceptionMapper<InvalidTranslationRequestException> {
        @Override
        public Response toResponse(InvalidTranslationRequestException e) {
            return json(Response.Status.BAD_REQUEST, e.getMessage());
        }
    }

    /** 400 - the JSON body couldn't be parsed (JSON-B error, wrapped or not by the runtime). */
    @Provider
    public static class MalformedJsonMapper implements ExceptionMapper<jakarta.json.bind.JsonbException> {
        @Override
        public Response toResponse(jakarta.json.bind.JsonbException e) {
            return json(Response.Status.BAD_REQUEST, "Malformed JSON body. Expected {\"text\": \"...\"}");
        }
    }

    @Provider
    public static class ProcessingMapper implements ExceptionMapper<jakarta.ws.rs.ProcessingException> {
        @Override
        public Response toResponse(jakarta.ws.rs.ProcessingException e) {
            return json(Response.Status.BAD_REQUEST, "Could not read request body: " + e.getMessage());
        }
    }

    /** 502 - the upstream LLM failed. */
    @Provider
    public static class LlmMapper implements ExceptionMapper<LlmException> {
        @Override
        public Response toResponse(LlmException e) {
            LOG.log(Level.WARNING, "LLM failure: {0}", e.getMessage());
            return json(Response.Status.BAD_GATEWAY, e.getMessage());
        }
    }

    /** Keeps the status of standard JAX-RS errors (404, 405, 415...) but returns JSON. */
    @Provider
    public static class WebAppMapper implements ExceptionMapper<WebApplicationException> {
        @Override
        public Response toResponse(WebApplicationException e) {
            Response.Status status = Response.Status.fromStatusCode(e.getResponse().getStatus());
            if (status == null) {
                return e.getResponse();
            }
            return json(status, e.getMessage());
        }
    }
}
