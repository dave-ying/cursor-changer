/// Theme and mode command contracts
/// 
/// Commands for theme mode and customization mode

use std::collections::HashMap;
use super::types::{ParameterSchema, CommandContract};

/// Get contracts for theme and mode commands
pub fn get_theme_mode_contracts() -> HashMap<String, CommandContract> {
    let mut contracts = HashMap::new();
    
    // Theme commands
    contracts.insert("set_theme_mode".to_string(), CommandContract {
        name: "set_theme_mode".to_string(),
        parameters: vec![
            ParameterSchema {
                name: "theme_mode".to_string(),
                param_type: "ThemeMode".to_string(),
                required: true,
                description: "Theme mode: 'light', 'dark', or 'system'".to_string(),
            },
        ],
    });
    
    contracts.insert("get_theme_mode".to_string(), CommandContract {
        name: "get_theme_mode".to_string(),
        parameters: vec![],
    });
    
    // Mode commands
    contracts.insert("switch_customization_mode".to_string(), CommandContract {
        name: "switch_customization_mode".to_string(),
        parameters: vec![
            ParameterSchema {
                name: "mode".to_string(),
                param_type: "CustomizationMode".to_string(),
                required: true,
                description: "Customization mode to switch to".to_string(),
            },
        ],
    });
    
    contracts.insert("get_customization_mode".to_string(), CommandContract {
        name: "get_customization_mode".to_string(),
        parameters: vec![],
    });
    
    contracts
}
