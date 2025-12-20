/// Cursor setting command contracts
/// 
/// Commands for setting cursor images and sizes

use std::collections::HashMap;
use super::types::{ParameterSchema, CommandContract};

/// Get contracts for cursor setting commands
pub fn get_cursor_setting_contracts() -> HashMap<String, CommandContract> {
    let mut contracts = HashMap::new();
    
    contracts.insert("set_cursor_image".to_string(), CommandContract {
        name: "set_cursor_image".to_string(),
        parameters: vec![
            ParameterSchema {
                name: "cursor_name".to_string(),
                param_type: "String".to_string(),
                required: true,
                description: "Name of the cursor type to set".to_string(),
            },
            ParameterSchema {
                name: "image_path".to_string(),
                param_type: "String".to_string(),
                required: true,
                description: "Path to the cursor image file".to_string(),
            },
        ],
    });
    
    contracts.insert("set_all_cursors".to_string(), CommandContract {
        name: "set_all_cursors".to_string(),
        parameters: vec![
            ParameterSchema {
                name: "image_path".to_string(),
                param_type: "String".to_string(),
                required: true,
                description: "Path to the cursor image file".to_string(),
            },
        ],
    });
    
    contracts.insert("set_all_cursors_with_size".to_string(), CommandContract {
        name: "set_all_cursors_with_size".to_string(),
        parameters: vec![
            ParameterSchema {
                name: "image_path".to_string(),
                param_type: "String".to_string(),
                required: true,
                description: "Path to the cursor image file".to_string(),
            },
            ParameterSchema {
                name: "size".to_string(),
                param_type: "i32".to_string(),
                required: true,
                description: "Size of the cursor in pixels".to_string(),
            },
        ],
    });
    
    contracts.insert("set_single_cursor_with_size".to_string(), CommandContract {
        name: "set_single_cursor_with_size".to_string(),
        parameters: vec![
            ParameterSchema {
                name: "cursor_name".to_string(),
                param_type: "String".to_string(),
                required: true,
                description: "Name of the cursor type to set".to_string(),
            },
            ParameterSchema {
                name: "image_path".to_string(),
                param_type: "String".to_string(),
                required: true,
                description: "Path to the cursor image file".to_string(),
            },
            ParameterSchema {
                name: "size".to_string(),
                param_type: "i32".to_string(),
                required: true,
                description: "Size of the cursor in pixels".to_string(),
            },
        ],
    });
    
    contracts.insert("set_multiple_cursors_with_size".to_string(), CommandContract {
        name: "set_multiple_cursors_with_size".to_string(),
        parameters: vec![
            ParameterSchema {
                name: "cursor_names".to_string(),
                param_type: "Vec<String>".to_string(),
                required: true,
                description: "Array of cursor type names to set".to_string(),
            },
            ParameterSchema {
                name: "image_path".to_string(),
                param_type: "String".to_string(),
                required: true,
                description: "Path to the cursor image file".to_string(),
            },
            ParameterSchema {
                name: "size".to_string(),
                param_type: "i32".to_string(),
                required: true,
                description: "Size of the cursor in pixels".to_string(),
            },
        ],
    });
    
    contracts.insert("set_cursor_size".to_string(), CommandContract {
        name: "set_cursor_size".to_string(),
        parameters: vec![
            ParameterSchema {
                name: "size".to_string(),
                param_type: "i32".to_string(),
                required: true,
                description: "Size of the cursor in pixels".to_string(),
            },
        ],
    });
    
    contracts
}
