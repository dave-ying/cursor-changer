/// Validation tests for command parameter contracts
/// 
/// These tests validate parameter schemas and detect breaking changes

use super::get_command_contracts;

/// Test that all command contracts are properly defined
#[test]
fn test_command_contracts_are_defined() {
    let contracts = get_command_contracts();
    
    // Verify we have contracts for key commands
    assert!(contracts.contains_key("get_status"), "Missing contract for get_status");
    assert!(contracts.contains_key("add_cursor_to_library"), "Missing contract for add_cursor_to_library");
    assert!(contracts.contains_key("set_cursor_image"), "Missing contract for set_cursor_image");
    assert!(contracts.contains_key("set_theme_mode"), "Missing contract for set_theme_mode");
    
    println!("✓ All {} command contracts are defined", contracts.len());
}

/// Test parameter schema validation for add_cursor_to_library
#[test]
fn test_add_cursor_to_library_parameter_schema() {
    let contracts = get_command_contracts();
    let contract = contracts.get("add_cursor_to_library")
        .expect("Contract for add_cursor_to_library should exist");
    
    assert_eq!(contract.parameters.len(), 4, "add_cursor_to_library should have 4 parameters");
    
    // Verify parameter names
    let param_names: Vec<&str> = contract.parameters.iter()
        .map(|p| p.name.as_str())
        .collect();
    assert!(param_names.contains(&"name"), "Missing 'name' parameter");
    assert!(param_names.contains(&"file_path"), "Missing 'file_path' parameter");
    assert!(param_names.contains(&"hotspot_x"), "Missing 'hotspot_x' parameter");
    assert!(param_names.contains(&"hotspot_y"), "Missing 'hotspot_y' parameter");
    
    // Verify parameter types
    let name_param = contract.parameters.iter()
        .find(|p| p.name == "name")
        .expect("name parameter should exist");
    assert_eq!(name_param.param_type, "String", "name should be String type");
    assert!(name_param.required, "name should be required");
    
    let hotspot_x_param = contract.parameters.iter()
        .find(|p| p.name == "hotspot_x")
        .expect("hotspot_x parameter should exist");
    assert_eq!(hotspot_x_param.param_type, "u16", "hotspot_x should be u16 type");
    
    println!("✓ add_cursor_to_library parameter schema is valid");
}

/// Test parameter schema validation for set_cursor_image
#[test]
fn test_set_cursor_image_parameter_schema() {
    let contracts = get_command_contracts();
    let contract = contracts.get("set_cursor_image")
        .expect("Contract for set_cursor_image should exist");
    
    assert_eq!(contract.parameters.len(), 2, "set_cursor_image should have 2 parameters");
    
    let param_names: Vec<&str> = contract.parameters.iter()
        .map(|p| p.name.as_str())
        .collect();
    assert!(param_names.contains(&"cursor_name"), "Missing 'cursor_name' parameter");
    assert!(param_names.contains(&"image_path"), "Missing 'image_path' parameter");
    
    println!("✓ set_cursor_image parameter schema is valid");
}

/// Test parameter schema validation for convert_image_to_cur_with_hotspot
#[test]
fn test_convert_image_to_cur_with_hotspot_parameter_schema() {
    let contracts = get_command_contracts();
    let contract = contracts.get("convert_image_to_cur_with_hotspot")
        .expect("Contract should exist");
    
    assert_eq!(contract.parameters.len(), 7, "Should have 7 parameters");
    
    let param_names: Vec<&str> = contract.parameters.iter()
        .map(|p| p.name.as_str())
        .collect();
    assert!(param_names.contains(&"input_path"));
    assert!(param_names.contains(&"size"));
    assert!(param_names.contains(&"hotspot_x"));
    assert!(param_names.contains(&"hotspot_y"));
    assert!(param_names.contains(&"scale"));
    assert!(param_names.contains(&"offset_x"));
    assert!(param_names.contains(&"offset_y"));
    
    println!("✓ convert_image_to_cur_with_hotspot parameter schema is valid");
}

/// Test parameter schema validation for set_all_cursors_with_size
#[test]
fn test_set_all_cursors_with_size_parameter_schema() {
    let contracts = get_command_contracts();
    let contract = contracts.get("set_all_cursors_with_size")
        .expect("Contract should exist");
    
    assert_eq!(contract.parameters.len(), 2, "Should have 2 parameters");
    
    let param_names: Vec<&str> = contract.parameters.iter()
        .map(|p| p.name.as_str())
        .collect();
    assert!(param_names.contains(&"image_path"));
    assert!(param_names.contains(&"size"));
    
    println!("✓ set_all_cursors_with_size parameter schema is valid");
}

/// Test parameter schema validation for reorder_library_cursors
#[test]
fn test_reorder_library_cursors_parameter_schema() {
    let contracts = get_command_contracts();
    let contract = contracts.get("reorder_library_cursors")
        .expect("Contract should exist");
    
    assert_eq!(contract.parameters.len(), 1, "Should have 1 parameter");
    
    let order_param = &contract.parameters[0];
    assert_eq!(order_param.name, "order");
    assert_eq!(order_param.param_type, "Vec<String>");
    assert!(order_param.required);
    
    println!("✓ reorder_library_cursors parameter schema is valid");
}

/// Test that parameterless commands have no parameters
#[test]
fn test_parameterless_commands() {
    let contracts = get_command_contracts();
    
    let parameterless_commands = vec![
        "get_status",
        "toggle_cursor",
        "restore_cursor",
        "get_library_cursors",
        "get_theme_mode",
        "get_customization_mode",
        "reset_all_settings",
        "quit_app",
    ];
    
    for cmd_name in parameterless_commands {
        let contract = contracts.get(cmd_name)
            .expect(&format!("Contract for {} should exist", cmd_name));
        assert_eq!(
            contract.parameters.len(), 
            0, 
            "{} should have no parameters", 
            cmd_name
        );
    }
    
    println!("✓ All parameterless commands are correctly defined");
}

/// Test detection of breaking changes - parameter removal
#[test]
fn test_detect_breaking_change_parameter_removal() {
    let contracts = get_command_contracts();
    let contract = contracts.get("add_cursor_to_library")
        .expect("Contract should exist");
    
    // Simulate a breaking change: removing a required parameter
    let modified_params = vec!["name", "file_path", "hotspot_x"]; // Missing hotspot_y
    
    let original_param_names: Vec<&str> = contract.parameters.iter()
        .filter(|p| p.required)
        .map(|p| p.name.as_str())
        .collect();
    
    let is_breaking = original_param_names.iter()
        .any(|name| !modified_params.contains(name));
    
    assert!(is_breaking, "Removing a required parameter should be detected as breaking");
    
    println!("✓ Breaking change detection works for parameter removal");
}

/// Test detection of breaking changes - parameter type change
#[test]
fn test_detect_breaking_change_type_modification() {
    let contracts = get_command_contracts();
    let contract = contracts.get("add_cursor_to_library")
        .expect("Contract should exist");
    
    // Get original hotspot_x type
    let original_type = contract.parameters.iter()
        .find(|p| p.name == "hotspot_x")
        .map(|p| p.param_type.as_str())
        .expect("hotspot_x should exist");
    
    // Simulate a breaking change: changing type from u16 to String
    let modified_type = "String";
    
    let is_breaking = original_type != modified_type;
    
    assert!(is_breaking, "Changing parameter type should be detected as breaking");
    
    println!("✓ Breaking change detection works for type modification");
}

/// Test that all required parameters are marked as required
#[test]
fn test_all_parameters_have_required_flag() {
    let contracts = get_command_contracts();
    
    for (cmd_name, contract) in contracts.iter() {
        for param in &contract.parameters {
            // All parameters in our current API are required
            // If we add optional parameters in the future, this test will need updating
            assert!(
                param.required, 
                "Parameter '{}' in command '{}' should be marked as required", 
                param.name, 
                cmd_name
            );
        }
    }
    
    println!("✓ All parameters are correctly marked as required");
}

/// Test that all parameters have descriptions
#[test]
fn test_all_parameters_have_descriptions() {
    let contracts = get_command_contracts();
    
    for (cmd_name, contract) in contracts.iter() {
        for param in &contract.parameters {
            assert!(
                !param.description.is_empty(), 
                "Parameter '{}' in command '{}' should have a description", 
                param.name, 
                cmd_name
            );
        }
    }
    
    println!("✓ All parameters have descriptions");
}

/// Test parameter consistency across similar commands
#[test]
fn test_parameter_consistency_across_commands() {
    let contracts = get_command_contracts();
    
    // Commands that use file_path should all use String type
    let file_path_commands = vec![
        "add_cursor_to_library",
        "get_library_cursor_preview",
        "get_cursor_with_hotspot",
        "read_cursor_file_as_data_url",
        "read_cursor_file_as_bytes",
        "render_cursor_image_preview",
    ];
    
    for cmd_name in file_path_commands {
        let contract = contracts.get(cmd_name)
            .expect(&format!("Contract for {} should exist", cmd_name));
        
        if let Some(param) = contract.parameters.iter().find(|p| p.name == "file_path") {
            assert_eq!(
                param.param_type, 
                "String", 
                "file_path in {} should be String type", 
                cmd_name
            );
        }
    }
    
    // Commands that use hotspot coordinates should use u16
    let hotspot_commands = vec![
        "add_cursor_to_library",
        "update_cursor_in_library",
        "convert_image_to_cur_with_hotspot",
        "add_uploaded_image_with_hotspot_to_library",
        "update_library_cursor_hotspot",
    ];
    
    for cmd_name in hotspot_commands {
        let contract = contracts.get(cmd_name)
            .expect(&format!("Contract for {} should exist", cmd_name));
        
        if let Some(param) = contract.parameters.iter().find(|p| p.name == "hotspot_x") {
            assert_eq!(
                param.param_type, 
                "u16", 
                "hotspot_x in {} should be u16 type", 
                cmd_name
            );
        }
        
        if let Some(param) = contract.parameters.iter().find(|p| p.name == "hotspot_y") {
            assert_eq!(
                param.param_type, 
                "u16", 
                "hotspot_y in {} should be u16 type", 
                cmd_name
            );
        }
    }
    
    println!("✓ Parameter types are consistent across similar commands");
}
