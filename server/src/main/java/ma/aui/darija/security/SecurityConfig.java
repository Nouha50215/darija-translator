package ma.aui.darija.security;

import jakarta.annotation.security.DeclareRoles;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.security.enterprise.authentication.mechanism.http.BasicAuthenticationMechanismDefinition;

/**
 * Activates the HTTP Basic authentication mechanism defined by Jakarta Security.
 * <p>
 * Jakarta Security's {@code HttpAuthenticationMechanism} is built on top of the
 * Jakarta Authentication SPI (a Server Auth Module installed by the container), so
 * every request to a protected URL goes through:
 * <ol>
 *   <li>the Basic mechanism, which decodes the {@code Authorization: Basic ...} header,</li>
 *   <li>{@link TranslatorIdentityStore}, which validates the username/password and
 *       returns the caller's groups,</li>
 *   <li>the web.xml security constraint, which requires the {@code translator} role.</li>
 * </ol>
 * Requests without valid credentials get {@code 401 Unauthorized} and never reach
 * the JAX-RS resource.
 */
@ApplicationScoped
@BasicAuthenticationMechanismDefinition(realmName = "darija-translator")
@DeclareRoles({SecurityConfig.ROLE_TRANSLATOR})
public class SecurityConfig {

    public static final String ROLE_TRANSLATOR = "translator";
}
