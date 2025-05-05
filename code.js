// Estrutura básica do plugin Figma para exportação de layout para Lua (Solar2D)

figma.showUI(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Exportar para Lua</title>
        <style>
            body {
                margin: 0;
                font-family: Arial, sans-serif;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 100vh;
                background-color: #f5f5f5;
            }
    
            .container {
                width: 90%;
                max-width: 400px;
                text-align: center;
                background: white;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                border-radius: 8px;
                padding: 20px;
            }
    
            h1 {
                font-size: 20px;
                color: #333;
                margin-bottom: 10px;
            }
    
            p {
                font-size: 14px;
                color: #666;
                margin-bottom: 20px;
            }
    
            button {
                background: #0078d4;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 10px 20px;
                font-size: 14px;
                cursor: pointer;
                transition: background 0.3s;
            }
    
            button:hover {
                background: #005fa3;
            }
    
            button:disabled {
                background: #ccc;
                cursor: not-allowed;
            }
    
            .message {
                margin-top: 20px;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Exportar para Lua</h1>
            <p>Selecione os elementos no Figma e clique no botão para gerar o código Lua.</p>
            <button id="export-button">Exportar Seleção</button>
            <div id="message" class="message"></div>
        </div>
    
        <script>
            const exportButton = document.getElementById('export-button');
            const messageDiv = document.getElementById('message');
    
            exportButton.addEventListener('click', () => {
                parent.postMessage({ pluginMessage: { type: 'export-to-lua' } }, '*');
                messageDiv.textContent = 'Exportando...';
                exportButton.disabled = true;
            });
    
            window.onmessage = (event) => {
                const { type, message, code } = event.data.pluginMessage;
    
                if (type === 'success') {
                    messageDiv.innerHTML = '<textarea style="width: 100%; height: 200px;">' + code + '</textarea>';
                    exportButton.disabled = false;
                } else if (type === 'error') {
                    messageDiv.textContent = message;
                    exportButton.disabled = false;
                }
            };
        </script>
    </body>
    </html>
    `, { width: 400, height: 400 });
    
    // Função principal
    figma.ui.onmessage = async (msg) => {
        if (msg.type === 'export-to-lua') {
            // Obter os nós selecionados no documento
            const selection = figma.currentPage.selection;
    
            if (selection.length === 0) {
                figma.ui.postMessage({ type: 'error', message: 'Nenhum elemento selecionado.' });
                return;
            }
    
            // Gerar código Lua com base na seleção
            const luaCode = selection.map(node => convertNodeToLua(node)).join('\n');
    
            // Enviar o código gerado para a UI
            figma.ui.postMessage({ type: 'success', code: luaCode });
        }
    };
    
    // Função que converte um nó do Figma em código Lua
    function convertNodeToLua(node) {
        switch (node.type) {
            case 'RECTANGLE':
                return generateRectangleCode(node);
            case 'TEXT':
                return generateTextCode(node);
            case 'FRAME':
                return generateFrameCode(node);
            case 'ELLIPSE':
                return generateEllipseCode(node);
            case 'LINE':
                return generateLineCode(node);
            case 'VECTOR':
                return generateVectorCode(node);
            default:
                return `-- Elemento não suportado: ${node.type}`;
        }
    }
    
    // Geradores de código para diferentes tipos de elementos
    function generateRectangleCode(node) {
        const color = extractFillColor(node);
        return `local rect = display.newRect(${node.x}, ${node.y}, ${node.width}, ${node.height})\nrect:setFillColor(${color})`;
    }
    
    function generateTextCode(node) {
        return `local text = display.newText({
            text = "${node.characters}",
            x = ${node.x},
            y = ${node.y},
            font = native.systemFont,
            fontSize = ${node.fontSize || 12}
        })\ntext:setFillColor(${extractFillColor(node)})`;
    }
    
    function generateFrameCode(node) {
        return `-- Frame: ${node.name}\n-- Adicionar lógica para os elementos do frame`;
    }
    
    function generateEllipseCode(node) {
        const radiusX = node.width / 2;
        const radiusY = node.height / 2;
        const color = extractFillColor(node);
        return `local circle = display.newCircle(${node.x + radiusX}, ${node.y + radiusY}, ${Math.min(radiusX, radiusY)})\ncircle:setFillColor(${color})`;
    }
    
    function generateLineCode(node) {
        const [x1, y1, x2, y2] = node.absoluteRenderBounds
            ? [
                node.absoluteRenderBounds.x,
                node.absoluteRenderBounds.y,
                node.absoluteRenderBounds.x + node.width,
                node.absoluteRenderBounds.y + node.height
            ]
            : [0, 0, 0, 0];
        const color = extractStrokeColor(node);
        return `local line = display.newLine(${x1}, ${y1}, ${x2}, ${y2})\nline:setStrokeColor(${color})`;
    }
    
    function generateVectorCode(node) {
        if (!node.vectorPaths || node.vectorPaths.length === 0) {
            return `-- Vetor: ${node.name} (sem caminhos vetoriais)`;
        }
    
        const fillColor = extractFillColor(node);
        let vectorCode = `local vectorGroup = display.newGroup()`;
    
        for (const path of node.vectorPaths) {
            const commands = path.data.match(/[MLC][^MLC]*/g); // Divide os comandos vetoriais
            if (!commands) continue;
    
            let pathCode = `local path = display.newLine()`;
            let isFirstCommand = true;
    
            for (const command of commands) {
                const type = command[0];
                const points = command.slice(1).trim().split(/[ ,]+/).map(Number);
    
                if (type === 'M') {
                    // MoveTo
                    pathCode += `\npath:append(${points[0]}, ${points[1]})`;
                } else if (type === 'L') {
                    // LineTo
                    pathCode += `\npath:append(${points[0]}, ${points[1]})`;
                } else if (type === 'C') {
                    // CurveTo (Bezier Cúbico)
                    for (let i = 0; i < points.length; i += 6) {
                        pathCode += `\npath:appendBezier(${points[i]}, ${points[i + 1]}, ${points[i + 2]}, ${points[i + 3]}, ${points[i + 4]}, ${points[i + 5]})`;
                    }
                }
    
                if (isFirstCommand) {
                    isFirstCommand = false;
                }
            }
    
            pathCode += `\npath:setStrokeColor(${fillColor})`;
            vectorCode += `\n${pathCode}\nvectorGroup:insert(path)`;
        }
    
        return vectorCode;
    }
    
    
    // Função para extrair cor de preenchimento
    function extractFillColor(node) {
        if (node.fills && node.fills.length > 0 && node.fills[0].type === 'SOLID') {
            const { r, g, b } = node.fills[0].color;
            return `${r}, ${g}, ${b}`;
        }
        return '1, 1, 1'; // Cor padrão branca
    }
    
    // Função para extrair cor de contorno
    function extractStrokeColor(node) {
        if (node.strokes && node.strokes.length > 0 && node.strokes[0].type === 'SOLID') {
            const { r, g, b } = node.strokes[0].color;
            return `${r}, ${g}, ${b}`;
        }
        return '0, 0, 0'; // Cor padrão preta
    }
    
    // Encerrar o plugin quando não for mais necessário
    figma.on('close', () => figma.closePlugin());