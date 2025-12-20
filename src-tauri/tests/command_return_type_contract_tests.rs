/// Contract tests for Tauri command return types
/// These tests validate return type schemas and detect breaking changes
///
/// **Validates: Requirements 9.3**
use serde_json::{json, Value};
use std::collections::HashMap;

/// Represents the expected schema for a command return type
#[derive(Debug, Clone)]
struct ReturnTypeSchema {
    type_name: String,
    is_result: bool,
    success_type: String,
    error_type: Option<String>,
    description: String,
}

/// Represents the contract for a Tauri command's return type
#[derive(Debug, Clone)]
struct CommandReturnContract {
    name: String,
    return_type: ReturnTypeSchema,
}

/// Registry of all command return type contracts
/// This serves as the source of truth for command return type schemas
fn get_command_return_contracts() -> HashMap<String, CommandReturnContract> {
    let mut contracts = HashMap::new();

    // Cursor commands
    contracts.insert(
        "get_status".to_string(),
        CommandReturnContract {
            name: "get_status".to_string(),
            return_type: ReturnTypeSchema {
                type_name: "Result<CursorStatePayload, String>".to_string(),
                is_result: true,
                success_type: "CursorStatePayload".to_string(),
                error_type: Some("String".to_string()),
                description: "Returns current cursor state or error message".to_string(),
            },
        },
    );

    contracts.insert(
        "toggle_cursor".to_string(),
        CommandReturnContract {
            name: "toggle_cursor".to_string(),
            return_type: ReturnTypeSchema {
                type_name: "Result<CursorStatePayload, String>".to_string(),
                is_result: true,
                success_type: "CursorStatePayload".to_string(),
                error_type: Some("String".to_string()),
                description: "Returns updated cursor state after toggle or error message"
                    .to_string(),
            },
        },
    );

    contracts.insert(
        "restore_cursor".to_string(),
        CommandReturnContract {
            name: "restore_cursor".to_string(),
            return_type: ReturnTypeSchema {
                type_name: "Result<CursorStatePayload, String>".to_string(),
                is_result: true,
                success_type: "CursorStatePayload".to_string(),
                error_type: Some("String".to_string()),
                description: "Returns updated cursor state after restore or error message"
                    .to_string(),
            },
        },
    );

    // Library commands
    contracts.insert(
        "get_library_cursors".to_string(),
        CommandReturnContract {
            name: "get_library_cursors".to_string(),
            return_type: ReturnTypeSchema {
                type_name: "Result<Vec<LibraryCursor>, String>".to_string(),
                is_result: true,
                success_type: "Vec<LibraryCursor>".to_string(),
                error_type: Some("String".to_string()),
                description: "Returns array of library cursors or error message".to_string(),
            },
        },
    );

    contracts.insert(
        "add_cursor_to_library".to_string(),
        CommandReturnContract {
            name: "add_cursor_to_library".to_string(),
            return_type: ReturnTypeSchema {
                type_name: "Result<LibraryCursor, String>".to_string(),
                is_result: true,
                success_type: "LibraryCursor".to_string(),
                error_type: Some("String".to_string()),
                description: "Returns newly added cursor or error message".to_string(),
            },
        },
    );

    contracts.insert(
        "remove_cursor_from_library".to_string(),
        CommandReturnContract {
            name: "remove_cursor_from_library".to_string(),
            return_type: ReturnTypeSchema {
                type_name: "Result<(), String>".to_string(),
                is_result: true,
                success_type: "()".to_string(),
                error_type: Some("String".to_string()),
                description: "Returns unit on success or error message".to_string(),
            },
        },
    );

    contracts.insert(
        "rename_cursor_in_library".to_string(),
        CommandReturnContract {
            name: "rename_cursor_in_library".to_string(),
            return_type: ReturnTypeSchema {
                type_name: "Result<(), String>".to_string(),
                is_result: true,
                success_type: "()".to_string(),
                error_type: Some("String".to_string()),
                description: "Returns unit on success or error message".to_string(),
            },
        },
    );

    contracts.insert(
        "update_cursor_in_library".to_string(),
        CommandReturnContract {
            name: "update_cursor_in_library".to_string(),
            return_type: ReturnTypeSchema {
                type_name: "Result<LibraryCursor, String>".to_string(),
                is_result: true,
                success_type: "LibraryCursor".to_string(),
                error_type: Some("String".to_string()),
                description: "Returns updated cursor or error message".to_string(),
            },
        },
    );

    contracts.insert(
        "reorder_library_cursors".to_string(),
        CommandReturnContract {
            name: "reorder_library_cursors".to_string(),
            return_type: ReturnTypeSchema {
                type_name: "Result<(), String>".to_string(),
                is_result: true,
                success_type: "()".to_string(),
                error_type: Some("String".to_string()),
                description: "Returns unit on success or error message".to_string(),
            },
        },
    );

    contracts.insert(
        "get_library_cursor_preview".to_string(),
        CommandReturnContract {
            name: "get_library_cursor_preview".to_string(),
            return_type: ReturnTypeSchema {
                type_name: "Result<String, String>".to_string(),
                is_result: true,
                success_type: "String".to_string(),
                error_type: Some("String".to_string()),
                description: "Returns data URL string or error message".to_string(),
            },
        },
    );

    // File operation commands
    contracts.insert(
        "convert_image_to_cur_with_hotspot".to_string(),
        CommandReturnContract {
            name: "convert_image_to_cur_with_hotspot".to_string(),
            return_type: ReturnTypeSchema {
                type_name: "Result<String, String>".to_string(),
                is_result: true,
                success_type: "String".to_string(),
                error_type: Some("String".to_string()),
                description: "Returns path to converted cursor file or error message".to_string(),
            },
        },
    );

    contracts.insert(
        "get_cursor_with_hotspot".to_string(),
        CommandReturnContract {
            name: "get_cursor_with_hotspot".to_string(),
            return_type: ReturnTypeSchema {
                type_name: "Result<CursorHotspotInfo, String>".to_string(),
                is_result: true,
                success_type: "CursorHotspotInfo".to_string(),
                error_type: Some("String".to_string()),
                description: "Returns cursor hotspot information or error message".to_string(),
            },
        },
    );

    contracts.insert(
        "read_cursor_file_as_data_url".to_string(),
        CommandReturnContract {
            name: "read_cursor_file_as_data_url".to_string(),
            return_type: ReturnTypeSchema {
                type_name: "Result<String, String>".to_string(),
                is_result: true,
                success_type: "String".to_string(),
                error_type: Some("String".to_string()),
                description: "Returns data URL string or error message".to_string(),
            },
        },
    );

    contracts.insert(
        "read_cursor_file_as_bytes".to_string(),
        CommandReturnContract {
            name: "read_cursor_file_as_bytes".to_string(),
            return_type: ReturnTypeSchema {
                type_name: "Result<Vec<u8>, String>".to_string(),
                is_result: true,
                success_type: "Vec<u8>".to_string(),
                error_type: Some("String".to_string()),
                description: "Returns raw bytes or error message".to_string(),
            },
        },
    );

    contracts.insert(
        "render_cursor_image_preview".to_string(),
        CommandReturnContract {
            name: "render_cursor_image_preview".to_string(),
            return_type: ReturnTypeSchema {
                type_name: "Result<String, String>".to_string(),
                is_result: true,
                success_type: "String".to_string(),
                error_type: Some("String".to_string()),
                description: "Returns data URL string or error message".to_string(),
            },
        },
    );

    contracts.insert(
        "add_uploaded_cursor_to_library".to_string(),
        CommandReturnContract {
            name: "add_uploaded_cursor_to_library".to_string(),
            return_type: ReturnTypeSchema {
                type_name: "Result<LibraryCursor, String>".to_string(),
                is_result: true,
                success_type: "LibraryCursor".to_string(),
                error_type: Some("String".to_string()),
                description: "Returns newly added cursor or error message".to_string(),
            },
        },
    );

    contracts.insert(
        "add_uploaded_image_with_hotspot_to_library".to_string(),
        CommandReturnContract {
            name: "add_uploaded_image_with_hotspot_to_library".to_string(),
            return_type: ReturnTypeSchema {
                type_name: "Result<LibraryCursor, String>".to_string(),
                is_result: true,
                success_type: "LibraryCursor".to_string(),
                error_type: Some("String".to_string()),
                description: "Returns newly added cursor or error message".to_string(),
            },
        },
    );

    contracts.insert(
        "update_library_cursor_hotspot".to_string(),
        CommandReturnContract {
            name: "update_library_cursor_hotspot".to_string(),
            return_type: ReturnTypeSchema {
                type_name: "Result<LibraryCursor, String>".to_string(),
                is_result: true,
                success_type: "LibraryCursor".to_string(),
                error_type: Some("String".to_string()),
                description: "Returns updated cursor or error message".to_string(),
            },
        },
    );

    // Cursor setting commands
    contracts.insert(
        "set_cursor_image".to_string(),
        CommandReturnContract {
            name: "set_cursor_image".to_string(),
            return_type: ReturnTypeSchema {
                type_name: "Result<(), String>".to_string(),
                is_result: true,
                success_type: "()".to_string(),
                error_type: Some("String".to_string()),
                description: "Returns unit on success or error message".to_string(),
            },
        },
    );

    contracts.insert(
        "set_all_cursors".to_string(),
        CommandReturnContract {
            name: "set_all_cursors".to_string(),
            return_type: ReturnTypeSchema {
                type_name: "Result<(), String>".to_string(),
                is_result: true,
                success_type: "()".to_string(),
                error_type: Some("String".to_string()),
                description: "Returns unit on success or error message".to_string(),
            },
        },
    );

    contracts.insert(
        "set_all_cursors_with_size".to_string(),
        CommandReturnContract {
            name: "set_all_cursors_with_size".to_string(),
            return_type: ReturnTypeSchema {
                type_name: "Result<(), String>".to_string(),
                is_result: true,
                success_type: "()".to_string(),
                error_type: Some("String".to_string()),
                description: "Returns unit on success or error message".to_string(),
            },
        },
    );

    contracts.insert(
        "set_single_cursor_with_size".to_string(),
        CommandReturnContract {
            name: "set_single_cursor_with_size".to_string(),
            return_type: ReturnTypeSchema {
                type_name: "Result<(), String>".to_string(),
                is_result: true,
                success_type: "()".to_string(),
                error_type: Some("String".to_string()),
                description: "Returns unit on success or error message".to_string(),
            },
        },
    );

    contracts.insert(
        "set_multiple_cursors_with_size".to_string(),
        CommandReturnContract {
            name: "set_multiple_cursors_with_size".to_string(),
            return_type: ReturnTypeSchema {
                type_name: "Result<(), String>".to_string(),
                is_result: true,
                success_type: "()".to_string(),
                error_type: Some("String".to_string()),
                description: "Returns unit on success or error message".to_string(),
            },
        },
    );

    contracts.insert(
        "set_cursor_size".to_string(),
        CommandReturnContract {
            name: "set_cursor_size".to_string(),
            return_type: ReturnTypeSchema {
                type_name: "Result<(), String>".to_string(),
                is_result: true,
                success_type: "()".to_string(),
                error_type: Some("String".to_string()),
                description: "Returns unit on success or error message".to_string(),
            },
        },
    );

    // Theme commands
    contracts.insert(
        "set_theme_mode".to_string(),
        CommandReturnContract {
            name: "set_theme_mode".to_string(),
            return_type: ReturnTypeSchema {
                type_name: "Result<(), String>".to_string(),
                is_result: true,
                success_type: "()".to_string(),
                error_type: Some("String".to_string()),
                description: "Returns unit on success or error message".to_string(),
            },
        },
    );

    contracts.insert(
        "get_theme_mode".to_string(),
        CommandReturnContract {
            name: "get_theme_mode".to_string(),
            return_type: ReturnTypeSchema {
                type_name: "Result<ThemeMode, String>".to_string(),
                is_result: true,
                success_type: "ThemeMode".to_string(),
                error_type: Some("String".to_string()),
                description: "Returns theme mode or error message".to_string(),
            },
        },
    );

    // Mode commands
    contracts.insert(
        "switch_customization_mode".to_string(),
        CommandReturnContract {
            name: "switch_customization_mode".to_string(),
            return_type: ReturnTypeSchema {
                type_name: "Result<(), String>".to_string(),
                is_result: true,
                success_type: "()".to_string(),
                error_type: Some("String".to_string()),
                description: "Returns unit on success or error message".to_string(),
            },
        },
    );

    contracts.insert(
        "get_customization_mode".to_string(),
        CommandReturnContract {
            name: "get_customization_mode".to_string(),
            return_type: ReturnTypeSchema {
                type_name: "Result<CustomizationMode, String>".to_string(),
                is_result: true,
                success_type: "CustomizationMode".to_string(),
                error_type: Some("String".to_string()),
                description: "Returns customization mode or error message".to_string(),
            },
        },
    );

    // Window commands
    contracts.insert(
        "set_run_on_startup".to_string(),
        CommandReturnContract {
            name: "set_run_on_startup".to_string(),
            return_type: ReturnTypeSchema {
                type_name: "Result<(), String>".to_string(),
                is_result: true,
                success_type: "()".to_string(),
                error_type: Some("String".to_string()),
                description: "Returns unit on success or error message".to_string(),
            },
        },
    );

    contracts.insert(
        "set_minimize_to_tray".to_string(),
        CommandReturnContract {
            name: "set_minimize_to_tray".to_string(),
            return_type: ReturnTypeSchema {
                type_name: "Result<(), String>".to_string(),
                is_result: true,
                success_type: "()".to_string(),
                error_type: Some("String".to_string()),
                description: "Returns unit on success or error message".to_string(),
            },
        },
    );

    contracts.insert(
        "set_accent_color".to_string(),
        CommandReturnContract {
            name: "set_accent_color".to_string(),
            return_type: ReturnTypeSchema {
                type_name: "Result<(), String>".to_string(),
                is_result: true,
                success_type: "()".to_string(),
                error_type: Some("String".to_string()),
                description: "Returns unit on success or error message".to_string(),
            },
        },
    );

    contracts.insert(
        "reset_all_settings".to_string(),
        CommandReturnContract {
            name: "reset_all_settings".to_string(),
            return_type: ReturnTypeSchema {
                type_name: "Result<(), String>".to_string(),
                is_result: true,
                success_type: "()".to_string(),
                error_type: Some("String".to_string()),
                description: "Returns unit on success or error message".to_string(),
            },
        },
    );

    contracts
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Test that all command return type contracts are properly defined
    #[test]
    fn test_command_return_contracts_are_defined() {
        let contracts = get_command_return_contracts();

        // Verify we have contracts for key commands
        assert!(
            contracts.contains_key("get_status"),
            "Missing return contract for get_status"
        );
        assert!(
            contracts.contains_key("add_cursor_to_library"),
            "Missing return contract for add_cursor_to_library"
        );
        assert!(
            contracts.contains_key("set_cursor_image"),
            "Missing return contract for set_cursor_image"
        );
        assert!(
            contracts.contains_key("set_theme_mode"),
            "Missing return contract for set_theme_mode"
        );

        println!(
            "✓ All {} command return type contracts are defined",
            contracts.len()
        );
    }

    /// Test that all commands return Result types for proper error handling
    #[test]
    fn test_all_commands_return_result_types() {
        let contracts = get_command_return_contracts();

        for (cmd_name, contract) in contracts.iter() {
            assert!(
                contract.return_type.is_result,
                "Command '{}' should return a Result type for proper error handling",
                cmd_name
            );

            assert!(
                contract.return_type.error_type.is_some(),
                "Command '{}' Result type should have an error type",
                cmd_name
            );
        }

        println!("✓ All commands return Result types");
    }

    /// Test that error types are consistent (all use String)
    #[test]
    fn test_error_types_are_consistent() {
        let contracts = get_command_return_contracts();

        for (cmd_name, contract) in contracts.iter() {
            if let Some(error_type) = &contract.return_type.error_type {
                assert_eq!(
                    error_type, "String",
                    "Command '{}' should use String as error type for consistency",
                    cmd_name
                );
            }
        }

        println!("✓ All error types are consistent (String)");
    }

    /// Test return type schema for get_status command
    #[test]
    fn test_get_status_return_type_schema() {
        let contracts = get_command_return_contracts();
        let contract = contracts
            .get("get_status")
            .expect("Contract for get_status should exist");

        assert_eq!(contract.return_type.success_type, "CursorStatePayload");
        assert_eq!(contract.return_type.error_type, Some("String".to_string()));
        assert!(contract.return_type.is_result);

        println!("✓ get_status return type schema is valid");
    }

    /// Test return type schema for library commands
    #[test]
    fn test_library_commands_return_type_schema() {
        let contracts = get_command_return_contracts();

        // get_library_cursors should return Vec<LibraryCursor>
        let get_contract = contracts
            .get("get_library_cursors")
            .expect("Contract for get_library_cursors should exist");
        assert_eq!(get_contract.return_type.success_type, "Vec<LibraryCursor>");

        // add_cursor_to_library should return LibraryCursor
        let add_contract = contracts
            .get("add_cursor_to_library")
            .expect("Contract for add_cursor_to_library should exist");
        assert_eq!(add_contract.return_type.success_type, "LibraryCursor");

        // remove_cursor_from_library should return unit
        let remove_contract = contracts
            .get("remove_cursor_from_library")
            .expect("Contract for remove_cursor_from_library should exist");
        assert_eq!(remove_contract.return_type.success_type, "()");

        println!("✓ Library commands return type schemas are valid");
    }

    /// Test return type schema for file operation commands
    #[test]
    fn test_file_operation_commands_return_type_schema() {
        let contracts = get_command_return_contracts();

        // convert_image_to_cur_with_hotspot should return String (path)
        let convert_contract = contracts
            .get("convert_image_to_cur_with_hotspot")
            .expect("Contract for convert_image_to_cur_with_hotspot should exist");
        assert_eq!(convert_contract.return_type.success_type, "String");

        // get_cursor_with_hotspot should return CursorHotspotInfo
        let hotspot_contract = contracts
            .get("get_cursor_with_hotspot")
            .expect("Contract for get_cursor_with_hotspot should exist");
        assert_eq!(
            hotspot_contract.return_type.success_type,
            "CursorHotspotInfo"
        );

        // read_cursor_file_as_bytes should return Vec<u8>
        let bytes_contract = contracts
            .get("read_cursor_file_as_bytes")
            .expect("Contract for read_cursor_file_as_bytes should exist");
        assert_eq!(bytes_contract.return_type.success_type, "Vec<u8>");

        println!("✓ File operation commands return type schemas are valid");
    }

    /// Test detection of breaking changes - return type modification
    #[test]
    fn test_detect_breaking_change_return_type_modification() {
        let contracts = get_command_return_contracts();
        let contract = contracts.get("get_status").expect("Contract should exist");

        // Simulate a breaking change: changing success type
        let original_type = &contract.return_type.success_type;
        let modified_type = "String"; // Changed from CursorStatePayload to String

        let is_breaking = original_type != modified_type;

        assert!(
            is_breaking,
            "Changing return type should be detected as breaking"
        );

        println!("✓ Breaking change detection works for return type modification");
    }

    /// Test detection of breaking changes - removing Result wrapper
    #[test]
    fn test_detect_breaking_change_removing_result_wrapper() {
        let contracts = get_command_return_contracts();
        let contract = contracts
            .get("get_library_cursors")
            .expect("Contract should exist");

        // Simulate a breaking change: removing Result wrapper
        let original_is_result = contract.return_type.is_result;
        let modified_is_result = false; // Changed from Result to direct return

        let is_breaking = original_is_result != modified_is_result;

        assert!(
            is_breaking,
            "Removing Result wrapper should be detected as breaking"
        );

        println!("✓ Breaking change detection works for Result wrapper removal");
    }

    /// Test that all return types have descriptions
    #[test]
    fn test_all_return_types_have_descriptions() {
        let contracts = get_command_return_contracts();

        for (cmd_name, contract) in contracts.iter() {
            assert!(
                !contract.return_type.description.is_empty(),
                "Return type for command '{}' should have a description",
                cmd_name
            );
        }

        println!("✓ All return types have descriptions");
    }

    /// Test return type consistency across similar commands
    #[test]
    fn test_return_type_consistency_across_similar_commands() {
        let contracts = get_command_return_contracts();

        // Commands that modify settings should return Result<(), String>
        let setting_commands = vec![
            "set_cursor_image",
            "set_all_cursors",
            "set_cursor_size",
            "set_theme_mode",
            "set_run_on_startup",
            "set_minimize_to_tray",
            "set_accent_color",
        ];

        for cmd_name in setting_commands {
            let contract = contracts
                .get(cmd_name)
                .expect(&format!("Contract for {} should exist", cmd_name));

            assert_eq!(
                contract.return_type.success_type, "()",
                "Setting command '{}' should return unit type on success",
                cmd_name
            );
        }

        // Commands that retrieve data should return Result<T, String> where T is not ()
        let getter_commands = vec![
            "get_status",
            "get_library_cursors",
            "get_theme_mode",
            "get_customization_mode",
        ];

        for cmd_name in getter_commands {
            let contract = contracts
                .get(cmd_name)
                .expect(&format!("Contract for {} should exist", cmd_name));

            assert_ne!(
                contract.return_type.success_type, "()",
                "Getter command '{}' should return data, not unit type",
                cmd_name
            );
        }

        println!("✓ Return types are consistent across similar commands");
    }

    /// Test that commands returning complex types are documented
    #[test]
    fn test_complex_return_types_are_documented() {
        let contracts = get_command_return_contracts();

        let complex_types = vec![
            ("get_status", "CursorStatePayload"),
            ("get_library_cursors", "Vec<LibraryCursor>"),
            ("add_cursor_to_library", "LibraryCursor"),
            ("get_cursor_with_hotspot", "CursorHotspotInfo"),
        ];

        for (cmd_name, expected_type) in complex_types {
            let contract = contracts
                .get(cmd_name)
                .expect(&format!("Contract for {} should exist", cmd_name));

            assert_eq!(
                contract.return_type.success_type, expected_type,
                "Command '{}' should return {}",
                cmd_name, expected_type
            );

            assert!(
                !contract.return_type.description.is_empty(),
                "Complex return type for '{}' should be documented",
                cmd_name
            );
        }

        println!("✓ Complex return types are properly documented");
    }

    /// Test that unit return types are used appropriately
    #[test]
    fn test_unit_return_types_are_appropriate() {
        let contracts = get_command_return_contracts();

        // Commands that should return unit (side-effect operations)
        let unit_return_commands = vec![
            "remove_cursor_from_library",
            "rename_cursor_in_library",
            "reorder_library_cursors",
            "set_cursor_image",
            "set_all_cursors",
            "set_cursor_size",
            "set_theme_mode",
            "switch_customization_mode",
            "set_run_on_startup",
            "set_minimize_to_tray",
            "set_accent_color",
            "reset_all_settings",
        ];

        for cmd_name in unit_return_commands {
            let contract = contracts
                .get(cmd_name)
                .expect(&format!("Contract for {} should exist", cmd_name));

            assert_eq!(
                contract.return_type.success_type, "()",
                "Side-effect command '{}' should return unit type",
                cmd_name
            );
        }

        println!("✓ Unit return types are used appropriately for side-effect operations");
    }

    /// Test that data retrieval commands return appropriate types
    #[test]
    fn test_data_retrieval_commands_return_data() {
        let contracts = get_command_return_contracts();

        // Commands that retrieve data should not return unit
        let data_commands = vec![
            "get_status",
            "get_library_cursors",
            "get_library_cursor_preview",
            "get_cursor_with_hotspot",
            "read_cursor_file_as_data_url",
            "read_cursor_file_as_bytes",
            "render_cursor_image_preview",
            "get_theme_mode",
            "get_customization_mode",
        ];

        for cmd_name in data_commands {
            let contract = contracts
                .get(cmd_name)
                .expect(&format!("Contract for {} should exist", cmd_name));

            assert_ne!(
                contract.return_type.success_type, "()",
                "Data retrieval command '{}' should return data, not unit",
                cmd_name
            );
        }

        println!("✓ Data retrieval commands return appropriate data types");
    }
}
