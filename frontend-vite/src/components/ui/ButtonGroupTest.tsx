import * as React from "react";
import { ButtonGroup } from "./button-group";
import { Button } from "./button";

function ButtonGroupTest() {
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold">Button Group Test</h2>

      <div className="border p-2">
        <h3 className="text-sm font-medium mb-2">Horizontal Button Group</h3>
        <ButtonGroup>
          <Button>Button 1</Button>
          <Button>Button 2</Button>
          <Button>Button 3</Button>
        </ButtonGroup>
      </div>

      <div className="border p-2">
        <h3 className="text-sm font-medium mb-2">Icon Button Group</h3>
        <ButtonGroup>
          <Button variant="outline" size="icon">
            <span>🔍</span>
          </Button>
          <Button variant="outline" size="icon">
            <span>⚙️</span>
          </Button>
          <Button variant="outline" size="icon">
            <span>📁</span>
          </Button>
        </ButtonGroup>
      </div>

      <div className="border p-2">
        <h3 className="text-sm font-medium mb-2">Mixed Button Group</h3>
        <ButtonGroup>
          <Button>Primary</Button>
          <Button variant="outline" size="icon">
            <span>⚙️</span>
          </Button>
          <Button variant="secondary">Secondary</Button>
        </ButtonGroup>
      </div>
    </div>
  );
}

export default ButtonGroupTest;
