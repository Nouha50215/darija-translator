package ma.aui.darija.rest;

import jakarta.ws.rs.ApplicationPath;
import jakarta.ws.rs.core.Application;

/** Bootstraps Jakarta REST: every resource is served under /api. */
@ApplicationPath("/api")
public class TranslatorApplication extends Application {
}
