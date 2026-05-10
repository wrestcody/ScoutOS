permit(
    principal,
    action in [
        file_system::Action::"open",
        file_system::Action::"read"
    ],
    resource
);
