// GenDia Playground - Browser-compatible version
class GenDiaPlayground {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.editor = document.getElementById('editor');
        this.errorMessage = document.getElementById('errorMessage');
        this.status = document.getElementById('status');
        this.canvasContainer = document.getElementById('canvasContainer');
        this.zoomLevel = document.getElementById('zoomLevel');
        this.coordinatesDisplay = document.getElementById('coordinatesDisplay');

        this.globalPosMap = {};
        this.acceptedPosArgs = ['l', 'r', 'u', 'd'];

        // Zoom and pan state
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        this.initializeEventListeners();
        this.resizeCanvas();

        // Load examples and render initial diagram
        this.loadExamples().then(() => {
            this.renderDiagram();
        });
    }

    initializeEventListeners() {
        document.getElementById('renderBtn').addEventListener('click', () => this.renderDiagram());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearEditor());

        // Auto-render on input (debounced)
        let timeout;
        this.editor.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => this.renderDiagram(), 500);
        });

        // Example buttons
        document.getElementById('basicExample').addEventListener('click', () => this.loadExample('basic'));
        document.getElementById('flowchartExample').addEventListener('click', () => this.loadExample('flowchart'));
        document.getElementById('angularExample').addEventListener('click', () => this.loadExample('angular'));
        document.getElementById('treeExample').addEventListener('click', () => this.loadExample('tree'));

        // Zoom controls
        document.getElementById('zoomReset').addEventListener('click', () => this.resetZoom());

        // Mouse wheel zoom
        this.canvasContainer.addEventListener('wheel', (e) => this.handleWheel(e));

        // Pan functionality
        this.canvasContainer.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvasContainer.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvasContainer.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvasContainer.addEventListener('mouseleave', (e) => this.handleMouseUp(e));

        // Coordinate tracking
        this.canvas.addEventListener('mousemove', (e) => this.updateCoordinates(e));
        this.canvas.addEventListener('mouseleave', () => this.hideCoordinates());

        // Resize canvas when window resizes
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.renderDiagram();
        });
    }

    async loadExamples() {
        this.examples = {};
        const exampleFiles = ['basic', 'flowchart', 'angular', 'tree'];

        for (const fileName of exampleFiles) {
            try {
                const response = await fetch(`examples/${fileName}.gendia`);
                if (response.ok) {
                    this.examples[fileName] = await response.text();
                } else {
                    console.warn(`Failed to load example: ${fileName}.gendia`);
                }
            } catch (error) {
                console.error(`Error loading example ${fileName}:`, error);
            }
        }
    }

    loadExample(exampleName) {
        if (this.examples[exampleName]) {
            this.editor.value = this.examples[exampleName];
            this.renderDiagram();
        }
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();

        // Set canvas size to match container
        this.canvas.width = rect.width - 40; // Account for padding
        this.canvas.height = rect.height - 40; // Account for padding
    }

    clearEditor() {
        this.editor.value = '';
        this.clearCanvas();
        this.hideError();
        this.updateStatus('Ready');
    }

    parseGendiaContent(content) {
        const lines = content.split('\n').map(line => line.trim()).filter(line => line);

        const result = {
            positionMap: [],
            connectionMap: [],
            shapeMap: []
        };

        let currentSection = null;

        for (const line of lines) {
            if (line === 'POSITION_MAP') {
                currentSection = 'position';
                continue;
            } else if (line === 'CONNECTION_MAP') {
                currentSection = 'connection';
                continue;
            } else if (line === 'SHAPE_MAP') {
                currentSection = 'shape';
                continue;
            }

            if (currentSection === 'position') {
                result.positionMap.push(line);
            } else if (currentSection === 'connection') {
                result.connectionMap.push(line);
            } else if (currentSection === 'shape') {
                result.shapeMap.push(line);
            }
        }

        return result;
    }

    parsePositionMap(positionInstructions) {
        return positionInstructions.map(instruction => {
            try {
                const [posArg, rest] = instruction.split('{');
                const [distance, nodesInfo] = rest.split('}');
                const [knownNode, newNode] = nodesInfo.split('|');

                const isAngular = posArg.includes('deg');
                let angle = null;

                if (isAngular) {
                    const [angleStr] = posArg.split('deg');
                    angle = Number(angleStr);
                }

                return {
                    posArg: posArg.trim(),
                    distance: Number(distance),
                    knownNode: knownNode.trim(),
                    newNode: newNode.trim(),
                    isAngular,
                    angle
                };
            } catch (error) {
                throw new Error(`Invalid position instruction: ${instruction}`);
            }
        });
    }

    parseConnectionMap(connectionInstructions) {
        return connectionInstructions.map(instruction => {
            try {
                const [nodes, lineStyle] = instruction.split('|');
                const [from, to] = nodes.split(':');

                return {
                    from: from.trim(),
                    to: to.trim(),
                    lineStyle: lineStyle.trim()
                };
            } catch (error) {
                throw new Error(`Invalid connection instruction: ${instruction}`);
            }
        });
    }

    parseShapeMap(shapeInstructions) {
        return shapeInstructions.map(instruction => {
            try {
                const [nodeName, shape] = instruction.split(':');

                return {
                    nodeName: nodeName.trim(),
                    shape: shape.trim()
                };
            } catch (error) {
                throw new Error(`Invalid shape instruction: ${instruction}`);
            }
        });
    }

    translatePos(positionObj, globalPosMap) {
        try {
            const { posArg, distance, knownNode, newNode, isAngular, angle } = positionObj;

            if (!globalPosMap[knownNode]) {
                throw Error(`Node ${knownNode} is not known at this line`);
            }

            let knownPos = globalPosMap[knownNode];
            let newX, newY;
            const gridSize = 20; // Convert grid units to pixels

            if (isAngular) {
                const theta = (angle * Math.PI) / 180;
                newX = knownPos.x + (distance * gridSize) * Math.cos(theta);
                newY = knownPos.y + (distance * gridSize) * Math.sin(theta);
            } else {
                if (!this.acceptedPosArgs.includes(posArg)) {
                    throw Error(`Invalid position argument: ${posArg}`);
                }

                const pixelDistance = distance * gridSize;
                switch (posArg) {
                    case 'l':
                        newX = knownPos.x - pixelDistance;
                        newY = knownPos.y;
                        break;
                    case 'r':
                        newX = knownPos.x + pixelDistance;
                        newY = knownPos.y;
                        break;
                    case 'u':
                        newX = knownPos.x;
                        newY = knownPos.y - pixelDistance;
                        break;
                    case 'd':
                        newX = knownPos.x;
                        newY = knownPos.y + pixelDistance;
                        break;
                }
            }

            if (newX === undefined || newY === undefined) {
                throw Error("Unable to determine the position");
            }

            globalPosMap[newNode] = { x: newX, y: newY };
        } catch (error) {
            throw new Error(`Position translation error: ${error.message}`);
        }
    }

    clearCanvas() {
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
        this.applyTransform();
        this.drawGrid();
    }

    drawGrid() {
        if (!this.globalPosMap['CENTER']) return;

        const gridSize = 20;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const centerPos = this.globalPosMap['CENTER'];

        this.ctx.save();
        this.ctx.strokeStyle = '#e5e7eb';
        this.ctx.lineWidth = 0.5;
        this.ctx.globalAlpha = 0.3;

        // Draw vertical lines aligned with CENTER
        const startX = centerPos.x % gridSize;
        for (let x = startX; x <= width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }
        for (let x = startX - gridSize; x >= 0; x -= gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }

        // Draw horizontal lines aligned with CENTER
        const startY = centerPos.y % gridSize;
        for (let y = startY; y <= height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }
        for (let y = startY - gridSize; y >= 0; y -= gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }

        // Draw major grid lines every 100px aligned with CENTER
        this.ctx.strokeStyle = '#d1d5db';
        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = 0.5;

        const majorStartX = centerPos.x % 100;
        for (let x = majorStartX; x <= width; x += 100) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }
        for (let x = majorStartX - 100; x >= 0; x -= 100) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }

        const majorStartY = centerPos.y % 100;
        for (let y = majorStartY; y <= height; y += 100) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }
        for (let y = majorStartY - 100; y >= 0; y -= 100) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    drawOriginIndicator() {
        // Draw red dot at the actual CENTER position used by GenDia
        if (this.globalPosMap['CENTER']) {
            this.ctx.save();

            const centerPos = this.globalPosMap['CENTER'];

            // Draw red dot at center
            this.ctx.fillStyle = '#ff4444';
            this.ctx.globalAlpha = 0.9;
            this.ctx.beginPath();
            this.ctx.arc(centerPos.x, centerPos.y, 5, 0, 2 * Math.PI);
            this.ctx.fill();

            // Draw label
            this.ctx.fillStyle = '#ff4444';
            this.ctx.font = '12px Courier New';
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'bottom';
            this.ctx.fillText('(0,0)', centerPos.x + 8, centerPos.y - 8);

            this.ctx.restore();
        }
    }

    drawNode(x, y, shape, label) {
        const size = 30;

        this.ctx.save();
        this.ctx.fillStyle = '#3498db';
        this.ctx.strokeStyle = '#2980b9';
        this.ctx.lineWidth = 2;

        switch (shape) {
            case 'rect':
                this.ctx.fillRect(x - size, y - size / 2, size * 2, size);
                this.ctx.strokeRect(x - size, y - size / 2, size * 2, size);
                break;
            case 'circ':
                this.ctx.beginPath();
                this.ctx.arc(x, y, size / 2, 0, 2 * Math.PI);
                this.ctx.fill();
                this.ctx.stroke();
                break;
            case 'diamond':
                this.ctx.beginPath();
                this.ctx.moveTo(x, y - size / 2);
                this.ctx.lineTo(x + size, y);
                this.ctx.lineTo(x, y + size / 2);
                this.ctx.lineTo(x - size, y);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
                break;
            default:
                // Default to rectangle
                this.ctx.fillRect(x - size, y - size / 2, size * 2, size);
                this.ctx.strokeRect(x - size, y - size / 2, size * 2, size);
        }

        // Draw label
        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(label, x, y);

        this.ctx.restore();
    }

    drawConnection(fromPos, toPos, lineStyle, fromShape, toShape) {
        this.ctx.save();
        this.ctx.strokeStyle = '#34495e';
        this.ctx.fillStyle = '#34495e';
        this.ctx.lineWidth = 2;

        if (lineStyle === 'dotted') {
            this.ctx.setLineDash([5, 5]);
        } else {
            this.ctx.setLineDash([]);
        }

        // Calculate angles for contour intersection
        const fromToAngle = Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x);
        const toFromAngle = Math.atan2(fromPos.y - toPos.y, fromPos.x - toPos.x);

        // Get contour points instead of center points
        const fromContour = this.getShapeContourPoint(fromPos, fromShape, fromToAngle);
        const toContour = this.getShapeContourPoint(toPos, toShape, toFromAngle);

        // Draw the line
        this.ctx.beginPath();
        this.ctx.moveTo(fromContour.x, fromContour.y);
        this.ctx.lineTo(toContour.x, toContour.y);
        this.ctx.stroke();

        // Draw arrows if needed
        if (lineStyle === 'arrow' || lineStyle === 'doublearrow') {
            this.drawArrowHead(fromContour, toContour);
        }

        if (lineStyle === 'doublearrow') {
            this.drawArrowHead(toContour, fromContour);
        }

        this.ctx.restore();
    }

    drawArrowHead(fromPos, toPos) {
        const arrowLength = 15;
        const arrowWidth = 8;

        // Calculate angle of the line
        const angle = Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x);

        // Calculate arrow head points
        const arrowX1 = toPos.x - arrowLength * Math.cos(angle - Math.PI / 6);
        const arrowY1 = toPos.y - arrowLength * Math.sin(angle - Math.PI / 6);
        const arrowX2 = toPos.x - arrowLength * Math.cos(angle + Math.PI / 6);
        const arrowY2 = toPos.y - arrowLength * Math.sin(angle + Math.PI / 6);

        // Draw arrow head
        this.ctx.beginPath();
        this.ctx.moveTo(toPos.x, toPos.y);
        this.ctx.lineTo(arrowX1, arrowY1);
        this.ctx.lineTo(arrowX2, arrowY2);
        this.ctx.closePath();
        this.ctx.fill();
    }

    /**Some math to get the contour point of a shape */
    getShapeContourPoint(centerPos, shape, angle) {
        const size = 30;

        switch (shape) {
            case 'rect':
                return this.getRectContourPoint(centerPos, size, angle);
            case 'circ':
                return this.getCircleContourPoint(centerPos, size / 2, angle);
            case 'diamond':
                return this.getDiamondContourPoint(centerPos, size, angle);
            default:
                return this.getRectContourPoint(centerPos, size, angle);
        }
    }

    getRectContourPoint(center, size, angle) {
        const halfWidth = size;
        const halfHeight = size / 2;

        // Normalize angle to [0, 2π]
        angle = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

        const dx = Math.cos(angle);
        const dy = Math.sin(angle);

        // Calculate intersection with rectangle edges
        let t = Infinity;

        // Right edge
        if (dx > 0) t = Math.min(t, halfWidth / dx);
        // Left edge
        if (dx < 0) t = Math.min(t, -halfWidth / dx);
        // Bottom edge
        if (dy > 0) t = Math.min(t, halfHeight / dy);
        // Top edge
        if (dy < 0) t = Math.min(t, -halfHeight / dy);

        return {
            x: center.x + t * dx,
            y: center.y + t * dy
        };
    }

    getCircleContourPoint(center, radius, angle) {
        return {
            x: center.x + radius * Math.cos(angle),
            y: center.y + radius * Math.sin(angle)
        };
    }

    getDiamondContourPoint(center, size, angle) {
        // Diamond is rotated 45 degrees, so we need to handle 4 edges
        const halfSize = size / 2;

        // Normalize angle to [0, 2π]
        angle = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

        const dx = Math.cos(angle);
        const dy = Math.sin(angle);

        // Diamond edges: top-right, bottom-right, bottom-left, top-left
        let t = Infinity;

        // Top edge (from top point to right point)
        if (dx + dy > 0) t = Math.min(t, halfSize / (dx + dy));
        // Right edge (from right point to bottom point)
        if (dx - dy > 0) t = Math.min(t, halfSize / (dx - dy));
        // Bottom edge (from bottom point to left point)
        if (-dx - dy > 0) t = Math.min(t, halfSize / (-dx - dy));
        // Left edge (from left point to top point)
        if (-dx + dy > 0) t = Math.min(t, halfSize / (-dx + dy));

        return {
            x: center.x + t * dx,
            y: center.y + t * dy
        };
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.style.display = 'block';
        this.updateStatus('Error');
    }

    hideError() {
        this.errorMessage.style.display = 'none';
    }

    updateStatus(message) {
        this.status.textContent = message;
    }

    renderDiagram() {
        try {
            this.hideError();
            this.updateStatus('Parsing...');

            const content = this.editor.value.trim();
            if (!content) {
                this.clearCanvas();
                this.updateStatus('Ready');
                return;
            }

            // Parse the content
            const rawMaps = this.parseGendiaContent(content);
            const positions = this.parsePositionMap(rawMaps.positionMap);
            const connections = this.parseConnectionMap(rawMaps.connectionMap);
            const shapes = this.parseShapeMap(rawMaps.shapeMap);

            // Clear canvas and reset position map
            this.clearCanvas();
            this.globalPosMap = {};

            // Set CENTER position at canvas center
            this.globalPosMap['CENTER'] = {
                x: this.canvas.width / 2,
                y: this.canvas.height / 2
            };

            this.updateStatus('Calculating positions...');

            // Process positions
            positions.forEach(pos => {
                this.translatePos(pos, this.globalPosMap);
            });

            this.updateStatus('Drawing connections...');

            // Apply zoom and pan transform
            this.applyTransform();

            // Create shape map for quick lookup
            const shapeMap = {};
            shapes.forEach(shape => {
                shapeMap[shape.nodeName] = shape.shape;
            });

            // Draw connections first (so they appear behind nodes)
            connections.forEach(conn => {
                const fromPos = this.globalPosMap[conn.from];
                const toPos = this.globalPosMap[conn.to];

                if (fromPos && toPos) {
                    const fromShape = shapeMap[conn.from] || 'rect';
                    const toShape = shapeMap[conn.to] || 'rect';
                    this.drawConnection(fromPos, toPos, conn.lineStyle, fromShape, toShape);
                }
            });

            this.updateStatus('Drawing nodes...');

            // Draw nodes
            Object.entries(this.globalPosMap).forEach(([nodeName, pos]) => {
                if (nodeName !== 'CENTER' || shapeMap['CENTER']) {
                    const shape = shapeMap[nodeName] || 'rect';
                    this.drawNode(pos.x, pos.y, shape, nodeName);
                }
            });

            // Draw origin indicator after transform is applied
            this.drawOriginIndicator();

            const nodeCount = Object.keys(this.globalPosMap).filter(node => node !== 'CENTER').length;
            this.updateStatus(`Rendered ${nodeCount} nodes, ${connections.length} connections`);

        } catch (error) {
            this.showError(error.message);
            console.error('Rendering error:', error);
        }
    }

    resetZoom() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.updateZoomLevel();
        this.renderDiagram();
    }

    updateZoomLevel() {
        this.zoomLevel.textContent = Math.round(this.zoom * 100) + '%';
    }

    applyTransform() {
        this.ctx.setTransform(this.zoom, 0, 0, this.zoom, this.panX, this.panY);
    }

    handleWheel(e) {
        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Convert mouse position to canvas coordinates
        const canvasX = (mouseX - this.panX) / this.zoom;
        const canvasY = (mouseY - this.panY) / this.zoom;

        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(5, this.zoom * zoomFactor));

        // Adjust pan to zoom towards mouse position
        this.panX = mouseX - canvasX * newZoom;
        this.panY = mouseY - canvasY * newZoom;
        this.zoom = newZoom;

        this.updateZoomLevel();
        this.renderDiagram();
    }

    handleMouseDown(e) {
        this.isDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.canvasContainer.classList.add('dragging');
    }

    handleMouseMove(e) {
        if (!this.isDragging) return;

        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;

        this.panX += deltaX;
        this.panY += deltaY;

        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;

        this.renderDiagram();
    }

    handleMouseUp(e) {
        this.isDragging = false;
        this.canvasContainer.classList.remove('dragging');
    }

    updateCoordinates(e) {
        if (!this.coordinatesDisplay) {
            console.error('coordinatesDisplay element not found');
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Transform mouse coordinates to account for zoom and pan
        const transformedX = (mouseX - this.panX) / this.zoom;
        const transformedY = (mouseY - this.panY) / this.zoom;

        // Calculate grid-based coordinates relative to CENTER
        if (this.globalPosMap['CENTER']) {
            const centerPos = this.globalPosMap['CENTER'];
            const gridSize = 20;

            // Calculate grid coordinates (each grid square = 20px)
            const gridX = Math.round((transformedX - centerPos.x) / gridSize);
            const gridY = Math.round((transformedY - centerPos.y) / gridSize);

            this.coordinatesDisplay.textContent = `x: ${gridX}, y: ${gridY}`;
            this.coordinatesDisplay.style.display = 'block';
        } else {
            // Fallback to canvas center if CENTER not available
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            const relativeX = Math.round(transformedX - centerX);
            const relativeY = Math.round(transformedY - centerY);
            this.coordinatesDisplay.textContent = `x: ${relativeX}, y: ${relativeY}`;
            this.coordinatesDisplay.style.display = 'block';
        }
    }
}

// Initialize the playground when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new GenDiaPlayground();
});
