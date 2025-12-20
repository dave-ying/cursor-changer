/// Export command parameter schemas to JSON for frontend validation
/// This allows the frontend to validate command parameters before invoking Tauri commands
///
/// **Validates: Requirements 9.2**
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ParameterSchema {
    name: String,
    #[serde(rename = "type")]
    param_type: String,
    required: bool,
    description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CommandSchema {
    name: String,
    parameters: Vec<ParameterSchema>,
}

#[derive(Debug, Serialize, Deserialize)]
struct CommandSchemaRegistry {
    version: String,
    commands: HashMap<String, CommandSchema>,
}

/// Get all command schemas
fn get_command_schemas() -> HashMap<String, CommandSchema> {
    let mut schemas = HashMap::new();

    // Cursor commands
    schemas.insert(
        "get_status".to_string(),
        CommandSchema {
            name: "get_status".to_string(),
            parameters: vec![],
        },
    );

    schemas.insert(
        "toggle_cursor".to_string(),
        CommandSchema {
            name: "toggle_cursor".to_string(),
            parameters: vec![],
        },
    );

    schemas.insert(
        "restore_cursor".to_string(),
        CommandSchema {
            name: "restore_cursor".to_string(),
            parameters: vec![],
        },
    );

    // Library commands
    schemas.insert(
        "get_library_cursors".to_string(),
        CommandSchema {
            name: "get_library_cursors".to_string(),
            parameters: vec![],
        },
    );

    schemas.insert(
        "add_cursor_to_library".to_string(),
        CommandSchema {
            name: "add_cursor_to_library".to_string(),
            parameters: vec![
                ParameterSchema {
                    name: "name".to_string(),
                    param_type: "string".to_string(),
                    required: true,
                    description: "Name of the cursor".to_string(),
                },
                ParameterSchema {
                    name: "file_path".to_string(),
                    param_type: "string".to_string(),
                    required: true,
                    description: "Path to the cursor file".to_string(),
                },
                ParameterSchema {
                    name: "hotspot_x".to_string(),
                    param_type: "number".to_string(),
                    required: true,
                    description: "X coordinate of cursor hotspot (0-65535)".to_string(),
                },
                ParameterSchema {
                    name: "hotspot_y".to_string(),
                    param_type: "number".to_string(),
                    required: true,
                    description: "Y coordinate of cursor hotspot (0-65535)".to_string(),
                },
            ],
        },
    );

    schemas.insert(
        "set_cursor_image".to_string(),
        CommandSchema {
            name: "set_cursor_image".to_string(),
            parameters: vec![
                ParameterSchema {
                    name: "cursor_name".to_string(),
                    param_type: "string".to_string(),
                    required: true,
                    description: "Name of the cursor type to set".to_string(),
                },
                ParameterSchema {
                    name: "image_path".to_string(),
                    param_type: "string".to_string(),
                    required: true,
                    description: "Path to the cursor image file".to_string(),
                },
            ],
        },
    );

    schemas.insert(
        "set_cursor_size".to_string(),
        CommandSchema {
            name: "set_cursor_size".to_string(),
            parameters: vec![ParameterSchema {
                name: "size".to_string(),
                param_type: "number".to_string(),
                required: true,
                description: "Size of the cursor in pixels".to_string(),
            }],
        },
    );

    schemas
}

/// Export command schemas to JSON file
fn export_schemas_to_json(output_path: &str) -> Result<(), String> {
    let schemas = get_command_schemas();

    let registry = CommandSchemaRegistry {
        version: "1.0.0".to_string(),
        commands: schemas,
    };

    let json = serde_json::to_string_pretty(&registry)
        .map_err(|e| format!("Failed to serialize schemas: {}", e))?;

    fs::write(output_path, json).map_err(|e| format!("Failed to write schema file: {}", e))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Test that schemas can be exported to JSON
    #[test]
    fn test_export_command_schemas() {
        let output_path = "target/command_schemas.json";

        let result = export_schemas_to_json(output_path);
        assert!(
            result.is_ok(),
            "Failed to export schemas: {:?}",
            result.err()
        );

        // Verify file was created
        assert!(
            Path::new(output_path).exists(),
            "Schema file was not created"
        );

        // Verify file can be read and parsed
        let content = fs::read_to_string(output_path).expect("Failed to read schema file");
        let registry: CommandSchemaRegistry =
            serde_json::from_str(&content).expect("Failed to parse schema JSON");

        assert!(
            !registry.commands.is_empty(),
            "Registry should contain commands"
        );
        assert_eq!(registry.version, "1.0.0", "Version should be 1.0.0");

        println!(
            "✓ Exported {} command schemas to {}",
            registry.commands.len(),
            output_path
        );
    }

    /// Test that exported schemas are valid JSON
    #[test]
    fn test_schema_json_validity() {
        let schemas = get_command_schemas();
        let registry = CommandSchemaRegistry {
            version: "1.0.0".to_string(),
            commands: schemas,
        };

        let json = serde_json::to_string_pretty(&registry).expect("Failed to serialize schemas");

        // Verify it can be parsed back
        let parsed: CommandSchemaRegistry =
            serde_json::from_str(&json).expect("Failed to parse serialized JSON");

        assert_eq!(parsed.version, registry.version);
        assert_eq!(parsed.commands.len(), registry.commands.len());

        println!("✓ Schema JSON is valid and can be round-tripped");
    }

    /// Test that parameter types are frontend-compatible
    #[test]
    fn test_parameter_types_are_frontend_compatible() {
        let schemas = get_command_schemas();

        let valid_types = vec!["string", "number", "boolean", "array", "object"];

        for (cmd_name, schema) in schemas.iter() {
            for param in &schema.parameters {
                assert!(
                    valid_types.contains(&param.param_type.as_str()),
                    "Parameter '{}' in command '{}' has invalid type '{}'. Must be one of: {:?}",
                    param.name,
                    cmd_name,
                    param.param_type,
                    valid_types
                );
            }
        }

        println!("✓ All parameter types are frontend-compatible");
    }
}
