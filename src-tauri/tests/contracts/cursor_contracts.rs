/// Cursor command contracts
/// 
/// Basic cursor operations: get_status, toggle_cursor, restore_cursor

use std::collections::HashMap;
use super::types::{ParameterSchema, CommandContract};

/// Get contracts for basic cursor commands
pub fn get_cursor_contracts() -> HashMap<String, CommandContract> {
    let mut contracts = HashMap::new();
    
    contracts.insert("get_status".to_string(), CommandContract {
        name: "get_status".to_string(),
        parameters: vec![],
    });
    
    contracts.insert("toggle_cursor".to_string(), CommandContract {
        name: "toggle_cursor".to_string(),
        parameters: vec![],
    });
    
    contracts.insert("restore_cursor".to_string(), CommandContract {
        name: "restore_cursor".to_string(),
        parameters: vec![],
    });
    
    contracts.insert("get_available_cursors".to_string(), CommandContract {
        name: "get_available_cursors".to_string(),
        parameters: vec![],
    });
    
    contracts
}
