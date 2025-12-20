/// Common types for command parameter contracts

/// Represents the expected schema for a command parameter
#[derive(Debug, Clone)]
pub struct ParameterSchema {
    pub name: String,
    pub param_type: String,
    pub required: bool,
    pub description: String,
}

/// Represents the contract for a Tauri command
#[derive(Debug, Clone)]
pub struct CommandContract {
    pub name: String,
    pub parameters: Vec<ParameterSchema>,
}
