import { Rcon } from 'rcon-client';

export class RCONManager {
    private client: Rcon | null = null;
    public isConnected = false;
    private isReconnecting = false;

    private readonly host: string;
    private readonly port: number;
    private readonly password: string;

    constructor() {
        this.host = process.env.RCON_HOST!;
        this.port = parseInt(process.env.RCON_PORT ?? '25575', 10);
        this.password = process.env.RCON_PASSWORD!;
    }

    async connect(): Promise<void> {
        if (this.isConnected) return;

        try {
            console.log('Trying to connect to RCON server...');

            this.client = new Rcon({
                host: this.host,
                port: this.port,
                password: this.password,
            });

            this.client.on('end', () => this.handleDisconnect('RCON connection closed'));
            this.client.on('error', (err: Error) => this.handleDisconnect(`RCON error: ${err.message}`));
            await this.client.connect();

            this.isConnected = true;
            this.isReconnecting = false;
            console.log('RCON connection established!');
        } catch (err: any) {
            console.error('Failed to connect to RCON:', err.message);
            this.isConnected = false;
            this.scheduleReconnect();
        }
    }

    async forceReconnect(): Promise<void> {
        if (this.client) {
            try { await this.client.disconnect(); } catch { /* already closed */ }
            this.client = null;
        }
        this.isConnected = false;
        this.isReconnecting = false;
        await this.connect();
    }

    async sendCommand(command: string): Promise<string> {
        if (!this.isConnected || !this.client) {
            throw new Error('RCON is currently disconnected. Please try again in a moment.');
        }

        return await this.client.send(command);
    }

    private handleDisconnect(reason: string): void {
        if (!this.isConnected && this.isReconnecting) return;

        console.warn(`${reason} - Attempting to reconnect...`);
        this.isConnected = false;
        this.scheduleReconnect();
    }

    private scheduleReconnect(): void {
        if (this.isReconnecting) return;
        this.isReconnecting = true;

        setTimeout(async () => {
            this.isReconnecting = false;
            await this.connect();
        }, 5000);
    }
}