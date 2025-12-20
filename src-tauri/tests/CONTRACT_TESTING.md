# Command Parameter Contract Testing

## Overview

This directory contains contract tests for Tauri command parameters. These tests ensure that:

1. **Parameter schemas are well-defined** - All commands have documented parameter types and requirements
2. **Breaking changes are detected** - Changes to parameter names, types, or requirements are caught
3. **Frontend-backend contracts remain stable** - TypeScript types match Rust function signatures

## Test Files

### `contracts/` Module

Core contract tests that validate parameter schemas and detect breaking changes. The contracts are organized by command category:

- `cursor_contracts.rs` - Cursor command contracts (get_status, toggle_cursor, restore_cursor, etc.)
- `library_contracts.rs` - Library command contracts (add/remove cursors, export, etc.)
- `file_contracts.rs` - File operation contracts (browse, convert, read files)
- `cursor_setting_contracts.rs` - Cursor setting contracts (set_cursor_*, set_all_cursors)
- `theme_mode_contracts.rs` - Theme mode contracts
- `window_contracts.rs` - Window command contracts (quit, minimize, startup, etc.)
- `validation_tests.rs` - Contract validation tests

**Key Tests:**
- `test_command_contracts_are_defined` - Verifies all commands have contracts
- `test_add_cursor_to_library_parameter_schema` - Validates specific command schemas
- `test_detect_breaking_change_parameter_removal` - Detects removed parameters
- `test_detect_breaking_change_type_modification` - Detects type changes
- `test_parameter_consistency_across_commands` - Ensures consistent types across similar commands

**Run tests:**
```bash
cargo test --test contracts
```

### `command_return_type_contract_tests.rs`

Contract tests that validate return type schemas and detect breaking changes.

**Key Tests:**
- `test_command_return_contracts_are_defined` - Verifies all commands have return type contracts
- `test_all_commands_return_result_types` - Ensures all commands use Result for error handling
- `test_error_types_are_consistent` - Validates consistent error types (String)
- `test_detect_breaking_change_return_type_modification` - Detects return type changes
- `test_detect_breaking_change_removing_result_wrapper` - Detects Result wrapper removal
- `test_return_type_consistency_across_similar_commands` - Ensures consistent return types

**Run tests:**
```bash
cargo test --test command_return_type_contract_tests
```

### `command_schema_export.rs`

Exports command schemas to JSON for frontend validation.

**Key Tests:**
- `test_export_command_schemas` - Exports schemas to `target/command_schemas.json`
- `test_schema_json_validity` - Validates JSON structure
- `test_parameter_types_are_frontend_compatible` - Ensures types work in JavaScript/TypeScript

**Run tests:**
```bash
cargo test --test command_schema_export
```

**Output:** `target/command_schemas.json` - JSON schema file for frontend use

### `command_pattern_linting_tests.rs`

Linting tests that enforce naming conventions, error handling patterns, and documentation requirements.

**Key Tests:**
- `test_all_commands_have_tauri_attribute` - Verifies #[tauri::command] attribute
- `test_all_commands_return_result` - Ensures Result<T, E> return types
- `test_all_commands_use_string_error_type` - Validates consistent error types
- `test_all_commands_follow_naming_convention` - Checks snake_case and verb-noun patterns
- `test_all_commands_have_documentation` - Ensures doc comments exist
- `test_command_naming_patterns_are_consistent` - Validates consistent naming across similar commands
- `test_error_handling_pattern_consistency` - Ensures consistent error handling
- `test_state_mutation_commands_emit_events` - Verifies state changes emit events
- `test_query_commands_do_not_mutate_state` - Ensures get_* commands are read-only

**Run tests:**
```bash
cargo test --test command_pattern_linting_tests
```

### `event_handler_contract_tests.rs`

Contract tests that verify event emission and handling between backend and frontend.

**Key Tests:**
- `test_all_backend_events_have_frontend_handlers` - Ensures all events have handlers
- `test_all_frontend_handlers_have_corresponding_backend_events` - Detects orphaned handlers
- `test_event_names_follow_naming_convention` - Validates kebab-case naming
- `test_all_event_handlers_process_payloads` - Ensures payload handling
- `test_event_payload_types_are_documented` - Validates payload type documentation
- `test_state_change_events_use_consistent_payload` - Ensures CursorStatePayload consistency
- `test_error_events_use_string_payload` - Validates error event payloads
- `test_event_emission_patterns_are_consistent` - Ensures state mutations emit events
- `test_frontend_handlers_are_properly_cleaned_up` - Validates cleanup in AppContext
- `test_critical_events_have_handlers` - Ensures critical events are handled

**Run tests:**
```bash
cargo test --test event_handler_contract_tests
```

## Adding New Commands

When adding a new Tauri command, update the contract registries:

1. **Add to the appropriate contract file in `contracts/` module:**

For example, if adding a cursor command, edit `contracts/cursor_contracts.rs`:

```rust
// In contracts/cursor_contracts.rs - get_cursor_contracts() function
contracts.insert("my_new_command".to_string(), CommandContract {
    name: "my_new_command".to_string(),
    parameters: vec![
        ParameterSchema {
            name: "param1".to_string(),
            param_type: "String".to_string(),
            required: true,
            description: "Description of param1".to_string(),
        },
    ],
});
```

2. **Add to `get_command_return_contracts()` in `command_return_type_contract_tests.rs`:**

```rust
contracts.insert("my_new_command".to_string(), CommandReturnContract {
    name: "my_new_command".to_string(),
    return_type: ReturnTypeSchema {
        type_name: "Result<MyReturnType, String>".to_string(),
        is_result: true,
        success_type: "MyReturnType".to_string(),
        error_type: Some("String".to_string()),
        description: "Returns MyReturnType on success or error message".to_string(),
    },
});
```

3. **Add to `get_command_schemas()` in `command_schema_export.rs`:**

```rust
schemas.insert("my_new_command".to_string(), CommandSchema {
    name: "my_new_command".to_string(),
    parameters: vec![
        ParameterSchema {
            name: "param1".to_string(),
            param_type: "string".to_string(), // Use frontend-compatible types
            required: true,
            description: "Description of param1".to_string(),
        },
    ],
});
```

4. **Run tests to verify:**

```bash
cargo test --test contracts
cargo test --test command_return_type_contract_tests
cargo test --test command_schema_export
```

## Type Mapping

### Rust to Contract Types

| Rust Type | Contract Type | Frontend Type |
|-----------|---------------|---------------|
| `String` | `String` | `string` |
| `i32`, `u32`, `u16` | `i32`, `u32`, `u16` | `number` |
| `bool` | `bool` | `boolean` |
| `Vec<T>` | `Vec<T>` | `array` |
| Custom struct | Struct name | `object` |

## Breaking Change Detection

The contract tests detect these breaking changes:

### Parameter Breaking Changes
1. **Parameter Removal** - Removing a required parameter
2. **Type Change** - Changing a parameter's type (e.g., `u16` → `String`)
3. **Name Change** - Renaming a parameter
4. **Requirement Change** - Making a required parameter optional (or vice versa)

### Return Type Breaking Changes
1. **Return Type Modification** - Changing the success type (e.g., `CursorStatePayload` → `String`)
2. **Result Wrapper Removal** - Removing the Result wrapper (e.g., `Result<T, E>` → `T`)
3. **Error Type Change** - Changing the error type (should always be `String`)
4. **Unit to Data Type** - Changing from unit `()` to a data type (or vice versa)

## Best Practices

1. **Always update contracts when modifying commands** - Keep contracts in sync with code
2. **Run contract tests before committing** - Catch breaking changes early
3. **Document parameter constraints** - Include valid ranges, formats, etc. in descriptions
4. **Use consistent types** - Same parameter names should use same types across commands
5. **Export schemas for frontend** - Run schema export tests to generate JSON for frontend validation

## Integration with CI/CD

Add to your CI pipeline:

```yaml
- name: Run contract tests
  run: |
    cd src-tauri
    cargo test --test contracts
    cargo test --test command_return_type_contract_tests
    cargo test --test command_schema_export
```

## Frontend Usage

The exported `command_schemas.json` can be used in the frontend to:

1. **Validate parameters before invoking commands**
2. **Generate TypeScript types automatically**
3. **Provide better error messages**
4. **Document available commands**

Example frontend validation:

```typescript
import commandSchemas from './command_schemas.json';

function validateCommandParams(commandName: string, params: any): boolean {
  const schema = commandSchemas.commands[commandName];
  if (!schema) return false;
  
  for (const param of schema.parameters) {
    if (param.required && !(param.name in params)) {
      throw new Error(`Missing required parameter: ${param.name}`);
    }
    
    const value = params[param.name];
    if (value !== undefined && typeof value !== param.type) {
      throw new Error(`Invalid type for ${param.name}: expected ${param.type}`);
    }
  }
  
  return true;
}
```

## Maintenance

- **Review contracts quarterly** - Ensure they match actual command signatures
- **Update when adding features** - New commands need contracts
- **Check for consistency** - Similar commands should have similar parameter patterns
- **Keep documentation current** - Update this file when adding new test patterns

## Related Files

- `generate_typescript_types.rs` - Generates TypeScript types from Rust structs
- `tauri_commands_unit_tests.rs` - Unit tests for command implementations
- `frontend-vite/src/types/generated/` - Generated TypeScript types

## Adding New Events

When adding a new event to the backend:

1. **Add to `get_backend_events()` in `event_handler_contract_tests.rs`:**

```rust
BackendEvent {
    name: "my-new-event".to_string(),
    payload_type: "MyPayloadType".to_string(),
    emitted_by: vec![
        "my_command".to_string(),
    ],
},
```

2. **Add to `get_frontend_event_handlers()` in `event_handler_contract_tests.rs`:**

```rust
FrontendEventHandler {
    event_name: "my-new-event".to_string(),
    handler_location: "frontend-vite/src/context/AppContext.jsx".to_string(),
    has_payload_handling: true,
},
```

3. **Implement the frontend handler in AppContext.jsx:**

```javascript
const setupMyEventListener = async () => {
  try {
    const unlisten = await listen('my-new-event', (event) => {
      // Handle the event
      console.log('Received my-new-event:', event.payload);
    });
    unlisteners.push(unlisten);
  } catch (error) {
    console.error('Failed to listen to my-new-event:', error);
  }
};

// Call in the setup section
setupMyEventListener();
```

4. **Run tests to verify:**

```bash
cargo test --test contracts
```

## Validates

**Requirements 9.2** - Command parameter schema validation and breaking change detection
**Requirements 9.3** - Command return type schema validation and breaking change detection
**Requirements 9.4** - Command naming conventions, error handling patterns, and documentation requirements
**Requirements 9.5** - Event handler existence and payload handling verification
