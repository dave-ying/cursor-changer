/// Window command contracts
/// 
/// Commands for window management and application settings

use std::collections::HashMap;
use super::types::{ParameterSchema, CommandContract};

/// Get contracts for window management commands
pub fn get_window_contracts() -> HashMap<String, CommandContract> {
    let mut contracts = HashMap::new();
    
    contracts.insert("set_run_on_startup".to_string(), CommandContract {
        name: "set_run_on_startup".to_string(),
        parameters: vec![
            ParameterSchema {
                name: "enabled".to_string(),
                param_type: "bool".to_string(),
                required: true,
                description: "Whether to run on startup".to_string(),
            },
        ],
    });
    
    contracts.insert("set_minimize_to_tray".to_string(), CommandContract {
        name: "set_minimize_to_tray".to_string(),
        parameters: vec![
            ParameterSchema {
                name: "enabled".to_string(),
                param_type: "bool".to_string(),
                required: true,
                description: "Whether to minimize to tray".to_string(),
            },
        ],
    });
    
    contracts.insert("set_accent_color".to_string(), CommandContract {
        name: "set_accent_color".to_string(),
        parameters: vec![
            ParameterSchema {
                name: "color".to_string(),
                param_type: "String".to_string(),
                required: true,
                description: "Accent color in hex format".to_string(),
            },
        ],
    });
    
    contracts.insert("reset_all_settings".to_string(), CommandContract {
        name: "reset_all_settings".to_string(),
        parameters: vec![],
    });
    
    contracts.insert("quit_app".to_string(), CommandContract {
        name: "quit_app".to_string(),
        parameters: vec![],
    });
    
    contracts
}
