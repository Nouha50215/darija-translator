package ma.aui.darija.security;

import ma.aui.darija.config.AppConfig;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class TranslatorIdentityStoreTest {

    @Test
    void parsesUserList() {
        Map<String, String> users = AppConfig.parseUsers("alice:pw1, bob:p:w2 ,broken,:nouser");
        assertEquals(2, users.size());
        assertEquals("pw1", users.get("alice"));
        assertEquals("p:w2", users.get("bob"));   // passwords may contain ':'
    }

    @Test
    void constantTimeEquals() {
        assertTrue(TranslatorIdentityStore.constantTimeEquals("secret", "secret"));
        assertFalse(TranslatorIdentityStore.constantTimeEquals("secret", "Secret"));
        assertFalse(TranslatorIdentityStore.constantTimeEquals("secret", null));
    }
}
