const findProcess = require('find-process');
const net = require('net');

class PortManager {
    constructor(initialPort, maxRetries = 5) {
        this.initialPort = initialPort;
        this.maxRetries = maxRetries;
    }

    async findAvailablePort(startPort) {
        const server = net.createServer();
        
        return new Promise((resolve, reject) => {
            server.listen(startPort, () => {
                const { port } = server.address();
                server.close(() => resolve(port));
            });
            
            server.on('error', async (err) => {
                if (err.code === 'EADDRINUSE') {
                    if (startPort < this.initialPort + this.maxRetries) {
                        resolve(await this.findAvailablePort(startPort + 1));
                    } else {
                        reject(new Error(`No available ports found between ${this.initialPort} and ${this.initialPort + this.maxRetries}`));
                    }
                } else {
                    reject(err);
                }
            });
        });
    }

    async killPort(port) {
        try {
            const list = await findProcess('port', port);
            const killed = [];
            
            for (const proc of list) {
                try {
                    process.kill(proc.pid);
                    killed.push(proc.pid);
                    console.log(`Killed process ${proc.pid} using port ${port}`);
                } catch (err) {
                    console.error(`Failed to kill process ${proc.pid}:`, err);
                }
            }
            
            return killed;
        } catch (err) {
            console.error(`Error finding processes for port ${port}:`, err);
            return [];
        }
    }

    async initialize() {
        try {
            // First try to find an available port
            const port = await this.findAvailablePort(this.initialPort);
            return port;
        } catch (err) {
            // If no ports available, try to kill the initial port and retry
            console.log(`No ports available, attempting to kill port ${this.initialPort}`);
            await this.killPort(this.initialPort);
            
            // Wait a bit for the port to be fully released
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Try one more time
            return this.findAvailablePort(this.initialPort);
        }
    }
}

module.exports = PortManager; 