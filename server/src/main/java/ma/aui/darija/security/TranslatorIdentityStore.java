package ma.aui.darija.security;

import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.security.enterprise.credential.Credential;
import jakarta.security.enterprise.credential.UsernamePasswordCredential;
import jakarta.security.enterprise.identitystore.CredentialValidationResult;
import jakarta.security.enterprise.identitystore.IdentityStore;
import ma.aui.darija.config.AppConfig;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import java.util.Set;

/**
 * Identity store that validates Basic-auth credentials against the accounts
 * configured in {@code TRANSLATOR_USERS}. Every valid user is put in the
 * {@code translator} group, which the container maps to the {@code translator} role.
 */
@ApplicationScoped
public class TranslatorIdentityStore implements IdentityStore {

    @Inject
    private AppConfig config;

    private Map<String, String> users;

    @PostConstruct
    void init() {
        users = config.users();
    }

    @Override
    public CredentialValidationResult validate(Credential credential) {
        if (!(credential instanceof UsernamePasswordCredential login)) {
            return CredentialValidationResult.NOT_VALIDATED_RESULT;
        }
        String expected = users.get(login.getCaller());
        if (expected != null && constantTimeEquals(expected, login.getPasswordAsString())) {
            return new CredentialValidationResult(login.getCaller(), Set.of(SecurityConfig.ROLE_TRANSLATOR));
        }
        return CredentialValidationResult.INVALID_RESULT;
    }

    /** Compares passwords without leaking timing information. */
    static boolean constantTimeEquals(String a, String b) {
        return MessageDigest.isEqual(
                a.getBytes(StandardCharsets.UTF_8),
                b == null ? new byte[0] : b.getBytes(StandardCharsets.UTF_8));
    }
}
