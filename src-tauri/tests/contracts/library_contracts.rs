/// Library command contracts
/// 
/// Commands for managing the cursor library

use std::collections::HashMap;
use super::types::{ParameterSchema, CommandContract};

/// Get contracts for library management commands
pub fn get_library_contracts() -> HashMap<String, CommandContract> {
    let mut contracts = HashMap::new();
    
    contracts.insert("get_library_cursors".to_string(), CommandContract {
        name: "get_library_cursors".to_string(),
        parameters: vec![],
    });
    
    contracts.insert("add_cursor_to_library".to_string(), CommandContract {
        name: "add_cursor_to_library".to_string(),
        parameters: vec![
            ParameterSchema {
                name: "name".to_string(),
                param_type: "String".to_string(),
                required: true,
                description: "Name of the cursor".to_string(),
            },
            ParameterSchema {
                name: "file_path".to_string(),
                param_type: "String".to_string(),
                required: true,
                description: "Path to the cursor file".to_string(),
            },
            ParameterSchema {
                name: "hotspot_x".to_string(),
                param_type: "u16".to_string(),
                required: true,
                description: "X coordinate of cursor hotspot".to_string(),
            },
            ParameterSchema {
                name: "hotspot_y".to_string(),
                param_type: "u16".to_string(),
                required: true,
                description: "Y coordinate of cursor hotspot".to_string(),
            },
        ],
    });
    
    contracts.insert("remove_cursor_from_library".to_string(), CommandContract {
        name: "remove_cursor_from_library".to_string(),
        parameters: vec![
            ParameterSchema {
                name: "id".to_string(),
                param_type: "String".to_string(),
                required: true,
                description: "ID of the cursor to remove".to_string(),
            },
        ],
    });
    
    contracts.insert("rename_cursor_in_library".to_string(), CommandContract {
        name: "rename_cursor_in_library".to_string(),
        parameters: vec![
            ParameterSchema {
                name: "id".to_string(),
                param_type: "String".to_string(),
                required: true,
                description: "ID of the cursor to rename".to_string(),
            },
            ParameterSchema {
                name: "new_name".to_string(),
                param_type: "String".to_string(),
                required: true,
                description: "New name for the cursor".to_string(),
            },
        ],
    });
    
    contracts.insert("update_cursor_in_library".to_string(), CommandContract {
        name: "update_cursor_in_library".to_string(),
        parameters: vec![
            ParameterSchema {
                name: "id".to_string(),
                param_type: "String".to_string(),
                required: true,
                description: "ID of the cursor to update".to_string(),
            },
            ParameterSchema {
                name: "name".to_string(),
                param_type: "String".to_string(),
                required: true,
                description: "New name for the cursor".to_string(),
            },
            ParameterSchema {
                name: "file_path".to_string(),
                param_type: "String".to_string(),
                required: true,
                description: "New file path for the cursor".to_string(),
            },
            ParameterSchema {
                name: "hotspot_x".to_string(),
                param_type: "u16".to_string(),
                required: true,
                description: "New X coordinate of cursor hotspot".to_string(),
            },
            ParameterSchema {
                name: "hotspot_y".to_string(),
                param_type: "u16".to_string(),
                required: true,
                description: "New Y coordinate of cursor hotspot".to_string(),
            },
        ],
    });
    
    contracts.insert("reorder_library_cursors".to_string(), CommandContract {
        name: "reorder_library_cursors".to_string(),
        parameters: vec![
            ParameterSchema {
                name: "order".to_string(),
                param_type: "Vec<String>".to_string(),
                required: true,
                description: "Array of cursor IDs in desired order".to_string(),
            },
        ],
    });
    
    contracts.insert("get_library_cursor_preview".to_string(), CommandContract {
        name: "get_library_cursor_preview".to_string(),
        parameters: vec![
            ParameterSchema {
                name: "file_path".to_string(),
                param_type: "String".to_string(),
                required: true,
                description: "Path to the cursor file".to_string(),
            },
        ],
    });
    
    contracts
}
