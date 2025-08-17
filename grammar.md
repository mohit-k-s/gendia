# GenDia Grammar Specification

This document and the test cases are created using Claude Sonnet 4
This document defines the complete grammar for `.gendia` files used by the GenDia diagram generator.

## File Structure

Every `.gendia` file must contain exactly three sections in this order:

```
POSITION_MAP
<position definitions>

CONNECTION_MAP
<connection definitions>

SHAPE_MAP
<shape definitions>
```

## POSITION_MAP Grammar

Defines node positions using relative positioning from existing nodes.

### Syntax

```
<positioning_expression>
```

Where `positioning_expression` is one of:

#### Directional Positioning
```
<direction>{<distance>}<known_node>|<new_node>
```

- `<direction>`: `l` (left), `r` (right), `u` (up), `d` (down)
- `<distance>`: Positive integer (pixels)
- `<known_node>`: Name of existing node (must be `CENTER` for first node)
- `<new_node>`: Name of new node being created

**Examples:**
```
r{50}CENTER|NodeA     # NodeA is 50px right of CENTER
d{30}NodeA|NodeB      # NodeB is 30px down from NodeA
l{80}NodeB|NodeC      # NodeC is 80px left of NodeB
```

#### Angular Positioning
```
<angle>deg{<radius>}<known_node>|<new_node>
```

- `<angle>`: Degrees (0-360), measured clockwise from positive x-axis
- `<radius>`: Distance in pixels from known node
- `<known_node>`: Name of existing node
- `<new_node>`: Name of new node being created

**Examples:**
```
45deg{60}CENTER|Node1    # Node1 is 45° clockwise from CENTER at 60px radius
135deg{40}Node1|Node2    # Node2 is 135° clockwise from Node1 at 40px radius
0deg{30}CENTER|Right     # Right is directly right (0°) from CENTER at 30px
```

### Reserved Keywords

- **`CENTER`**: Required starting node, represents the origin point (0,0)

### Rules

1. First position definition must reference `CENTER`
2. All subsequent nodes must reference previously defined nodes
3. Node names must be unique
4. Node names are case-sensitive
5. No spaces allowed in node names

## CONNECTION_MAP Grammar

Defines connections between nodes with line styles.

### Syntax

```
<node1>:<node2>|<line_style>
```

- `<node1>`: Source node name (must exist in POSITION_MAP)
- `<node2>`: Target node name (must exist in POSITION_MAP)
- `<line_style>`: `line` (solid) or `dotted`

**Examples:**
```
NodeA:NodeB|line      # Solid line from NodeA to NodeB
NodeB:NodeC|dotted    # Dotted line from NodeB to NodeC
```

### Rules

1. Both nodes must be defined in POSITION_MAP
2. Connections are directional (A:B is from A to B)
3. Self-connections are allowed (A:A)
4. Multiple connections between same nodes are allowed

## SHAPE_MAP Grammar

Defines visual appearance of nodes.

### Syntax

```
<node_name>:<shape_type>
```

- `<node_name>`: Node name (must exist in POSITION_MAP)
- `<shape_type>`: `rect` (rectangle) or `circ` (circle)

**Examples:**
```
NodeA:rect     # NodeA is rendered as rectangle
NodeB:circ     # NodeB is rendered as circle
```

### Rules

1. Node must be defined in POSITION_MAP
2. Each node can have only one shape definition
3. Nodes without shape definitions use default rendering

## Complete Example

```
POSITION_MAP
r{50}CENTER|Start
d{40}Start|Process
45deg{60}Process|Decision
l{80}Decision|End

CONNECTION_MAP
Start:Process|line
Process:Decision|line
Decision:End|dotted
End:Start|line

SHAPE_MAP
Start:circ
Process:rect
Decision:circ
End:rect
```

## Coordinate System

- Origin (0,0) is at CENTER
- Positive X is right, negative X is left
- Positive Y is down, negative Y is up
- Angles measured clockwise from positive X-axis:
  - 0° = right (+X)
  - 90° = down (+Y)
  - 180° = left (-X)
  - 270° = up (-Y)

## Error Conditions

### Position Errors
- Referencing undefined node
- Invalid direction keyword
- Missing CENTER node
- Malformed syntax

### Connection Errors
- Referencing undefined nodes
- Invalid line style
- Malformed syntax

### Shape Errors
- Referencing undefined nodes
- Invalid shape type
- Malformed syntax

## Best Practices

1. **Start Simple**: Begin with CENTER and build outward
2. **Consistent Naming**: Use descriptive, consistent node names
3. **Logical Flow**: Define nodes in logical order
4. **Test Incrementally**: Add nodes one at a time when debugging
5. **Comment Intent**: Use meaningful node names that describe purpose
