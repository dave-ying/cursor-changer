/// File operation command contracts
/// 
/// Commands for file operations: conversion, reading, uploading

use std::collections::HashMap;
use super::types::{ParameterSchema, CommandContract};

/// Get contracts for file operation commands
pub fn get_file_contracts() -> HashMap<String, CommandContract> {
    let mut contracts = HashMap::new();
    
    contracts.insert("convert_image_to_cur_with_hotspot".to_string(), CommandContract {
        name: "convert_image_to_cur_with_hotspot".to_string(),
        parameters: vec![
            ParameterSchema {
                name: "input_path".to_string(),
                param_type: "String".to_string(),
                required: true,
                description: "Path to input image file".to_string(),
            },
            ParameterSchema {
                name: "size".to_string(),
                param_type: "u32".to_string(),
                required: true,
                description: "Size of the cursor in pixels".to_string(),
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
            ParameterSchema {
                name: "scale".to_string(),
                param_type: "f32".to_string(),
                required: true,
                description: "Scale factor to apply (1.0 = 100%)".to_string(),
            },
            ParameterSchema {
                name: "offset_x".to_string(),
                param_type: "i32".to_string(),
                required: true,
                description: "Horizontal offset in pixels".to_string(),
            },
            ParameterSchema {
                name: "offset_y".to_string(),
                param_type: "i32".to_string(),
                required: true,
                description: "Vertical offset in pixels".to_string(),
            },
        ],
    });
    
    contracts.insert("get_cursor_with_hotspot".to_string(), CommandContract {
        name: "get_cursor_with_hotspot".to_string(),
        parameters: vec![
            ParameterSchema {
                name: "file_path".to_string(),
                param_type: "String".to_string(),
                required: true,
                description: "Path to the cursor file".to_string(),
            },
        ],
    });
    
    contracts.insert("read_cursor_file_as_data_url".to_string(), CommandContract {
        name: "read_cursor_file_as_data_url".to_string(),
        parameters: vec![
            ParameterSchema {
                name: "file_path".to_string(),
                param_type: "String".to_string(),
                required: true,
                description: "Path to the cursor file".to_string(),
            },
        ],
    });
    
    contracts.insert("read_cursor_file_as_bytes".to_string(), CommandContract {
        name: "read_cursor_file_as_bytes".to_string(),
        parameters: vec![
            ParameterSchema {
                name: "file_path".to_string(),
                param_type: "String".to_string(),
                required: true,
                description: "Path to the cursor file".to_string(),
            },
        ],
    });
    
    contracts.insert("render_cursor_image_preview".to_string(), CommandContract {
        name: "render_cursor_image_preview".to_string(),
        parameters: vec![
            ParameterSchema {
                name: "file_path".to_string(),
                param_type: "String".to_string(),
                required: true,
                description: "Path to the cursor file".to_string(),
            },
        ],
    });
    
    contracts.insert("add_uploaded_cursor_to_library".to_string(), CommandContract {
        name: "add_uploaded_cursor_to_library".to_string(),
        parameters: vec![
            ParameterSchema {
                name: "filename".to_string(),
                param_type: "String".to_string(),
                required: true,
                description: "Name of the uploaded file".to_string(),
            },
            ParameterSchema {
                name: "data".to_string(),
                param_type: "Vec<u8>".to_string(),
                required: true,
                description: "Raw bytes of the uploaded file".to_string(),
            },
        ],
    });
    
    contracts.insert("add_uploaded_image_with_hotspot_to_library".to_string(), CommandContract {
        name: "add_uploaded_image_with_hotspot_to_library".to_string(),
        parameters: vec![
            ParameterSchema {
                name: "filename".to_string(),
                param_type: "String".to_string(),
                required: true,
                description: "Name of the uploaded file".to_string(),
            },
            ParameterSchema {
                name: "data".to_string(),
                param_type: "Vec<u8>".to_string(),
                required: true,
                description: "Raw bytes of the uploaded file".to_string(),
            },
            ParameterSchema {
                name: "size".to_string(),
                param_type: "u32".to_string(),
                required: true,
                description: "Size of the cursor in pixels".to_string(),
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
            ParameterSchema {
                name: "scale".to_string(),
                param_type: "f32".to_string(),
                required: true,
                description: "Scale factor to apply (1.0 = 100%)".to_string(),
            },
            ParameterSchema {
                name: "offset_x".to_string(),
                param_type: "i32".to_string(),
                required: true,
                description: "Horizontal offset in pixels".to_string(),
            },
            ParameterSchema {
                name: "offset_y".to_string(),
                param_type: "i32".to_string(),
                required: true,
                description: "Vertical offset in pixels".to_string(),
            },
        ],
    });
    
    contracts.insert("update_library_cursor_hotspot".to_string(), CommandContract {
        name: "update_library_cursor_hotspot".to_string(),
        parameters: vec![
            ParameterSchema {
                name: "id".to_string(),
                param_type: "String".to_string(),
                required: true,
                description: "ID of the cursor to update".to_string(),
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
    
    contracts
}
