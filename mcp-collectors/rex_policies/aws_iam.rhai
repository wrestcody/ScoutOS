// In a real system, there would be an aws:: SDK exposed by rex.
// For now, we simulate fetching the password policy by reading a mock local file
// (or generating the JSON data securely in memory).

let policy_data = #{
    MinimumPasswordLength: 14,
    RequireSymbols: true,
    RequireNumbers: true,
    RequireUppercaseCharacters: true,
    RequireLowercaseCharacters: true,
    AllowUsersToChangePassword: true,
    MaxPasswordAge: 90,
    PasswordReusePrevention: 24
};

// Return the evidence
to_json(policy_data)
