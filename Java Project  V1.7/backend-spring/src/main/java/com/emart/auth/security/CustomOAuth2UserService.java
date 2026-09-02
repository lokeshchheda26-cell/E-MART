package com.emart.auth.security;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import com.emart.entity.AuthProvider;
import com.emart.entity.Role;
import com.emart.entity.User;
import com.emart.repository.UserRepository;

@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    @Autowired
    private UserRepository userRepository;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {

        // Fetches the profile from Google using the access token
        OAuth2User oAuth2User = super.loadUser(userRequest);

        Map<String, Object> attributes = oAuth2User.getAttributes();

        String email = (String) attributes.get("email");

        if (email == null || email.isBlank()) {
            throw new OAuth2AuthenticationException("Google account did not return an email address");
        }

        String firstName = (String) attributes.getOrDefault("given_name", "Google");
        String lastName = (String) attributes.getOrDefault("family_name", "User");

        // If someone already registered with this email using normal login,
        // this links their Google login to the SAME account.
        User user = userRepository.findByEmail(email).orElseGet(() -> {

            User newUser = new User();

            newUser.setEmail(email);
            newUser.setFirstName(firstName);
            newUser.setLastName(lastName);
            newUser.setRole(Role.CUSTOMER);
            newUser.setAuthProvider(AuthProvider.GOOGLE);
            newUser.setIsEmcardMember(false);
            newUser.setEmcardPoints(0);

            // Google-only users have no local password.
            // This value can never match a real bcrypt comparison,
            // so email/password login stays impossible for this account
            // unless they separately set a password later.
            newUser.setPassword("OAUTH2_GOOGLE_ACCOUNT_NO_PASSWORD");

            return userRepository.save(newUser);
        });

        return new CustomOAuth2User(oAuth2User, user);
    }
}
