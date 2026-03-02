# Bugfix Requirements Document

## Introduction

The user profile display system currently only shows basic authentication information (phone number and account creation date) instead of the complete business profile information that users provide during profile setup. This creates a poor user experience where users cannot see their business identity (shop name, user name, business type, city) after completing profile setup, making the application feel incomplete and impersonal.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user completes profile setup and logs into the application THEN the UserProfile component only displays phone number and account creation date from the auth session

1.2 WHEN a user has provided shop name, user name, business type, and city during profile setup THEN this business profile information is not fetched or displayed in the header

1.3 WHEN the profile API is available and contains complete business profile data THEN the UserProfile component ignores this data and only uses basic auth session data

1.4 WHEN users view their profile in the header THEN they see generic authentication information instead of their personalized business identity

### Expected Behavior (Correct)

2.1 WHEN a user completes profile setup and logs into the application THEN the UserProfile component SHALL fetch and display their complete business profile information including shop name and user name prominently

2.2 WHEN a user has provided shop name, user name, business type, and city during profile setup THEN the UserProfile component SHALL display this information with shop name and user name as primary identifiers

2.3 WHEN the profile API is available and contains complete business profile data THEN the UserProfile component SHALL use this data instead of relying only on basic auth session data

2.4 WHEN users view their profile in the header THEN they SHALL see their personalized business identity with shop name prominently displayed and phone number as secondary information

2.5 WHEN the profile API is unavailable due to network issues (ISP blocks in India) THEN the UserProfile component SHALL gracefully handle the error and show appropriate loading states or fallback information

2.6 WHEN profile data is incomplete or missing THEN the UserProfile component SHALL handle these cases appropriately without breaking the display

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user clicks the logout button THEN the system SHALL CONTINUE TO log out the user and redirect to the login page as before

3.2 WHEN the auth session is invalid or expired THEN the UserProfile component SHALL CONTINUE TO return null and not display any profile information

3.3 WHEN phone number formatting is applied THEN the system SHALL CONTINUE TO format phone numbers in the same readable format (+91 XXXXX XXXXX)

3.4 WHEN date formatting is applied THEN the system SHALL CONTINUE TO format dates according to the user's language preference (hi-IN, mr-IN, en-IN)

3.5 WHEN the UserProfile component is not provided with a valid user session THEN it SHALL CONTINUE TO return null without attempting to fetch profile data

3.6 WHEN translation keys are used for UI text THEN the system SHALL CONTINUE TO display text in the user's selected language