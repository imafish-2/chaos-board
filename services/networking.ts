import { Peer } from 'peerjs';

type MessageType = 'JOIN_REQUEST' | 'JOIN_ACK' | 'GAME_UPDATE' | 'CLIENT_INPUT';

interface NetworkMessage {
  type: MessageType;
  roomCode: string; // Not strictly needed for PeerJS data but kept for compat
  payload: any;
}

class NetworkService {
  private peer: Peer | null = null;
  private connections: any[] = [];
  private listeners: ((msg: NetworkMessage) => void)[] = [];
  private hostConnection: any | null = null;
  
  // Prefix to make sure our IDs don't collide with other PeerJS users
  private ID_PREFIX = 'chaos-board-game-v1-';

  constructor() {}

  // Called by TV
  public async host(roomCode: string): Promise<boolean> {
      if (this.peer) this.peer.destroy();
      
      return new Promise((resolve) => {
          // Create a peer with a specific ID based on room code
          this.peer = new Peer(this.ID_PREFIX + roomCode);

          this.peer.on('open', (id) => {
              console.log('Host initialized:', id);
              resolve(true);
          });

          this.peer.on('error', (err) => {
              console.error('Peer error:', err);
              resolve(false);
          });

          this.peer.on('connection', (conn) => {
              this.connections.push(conn);
              
              conn.on('data', (data: any) => {
                  this.notify(data);
              });

              conn.on('close', () => {
                  this.connections = this.connections.filter(c => c !== conn);
              });
          });
      });
  }

  // Called by Phone
  public async join(roomCode: string): Promise<boolean> {
      if (this.peer) this.peer.destroy();

      return new Promise((resolve) => {
          this.peer = new Peer(); // Random ID for client

          this.peer.on('open', () => {
              // Connect to the Host
              const conn = this.peer!.connect(this.ID_PREFIX + roomCode);
              
              conn.on('open', () => {
                  this.hostConnection = conn;
                  resolve(true);
              });

              conn.on('data', (data: any) => {
                  this.notify(data);
              });

              conn.on('error', () => {
                  resolve(false);
              });
          });

          this.peer.on('error', () => {
              resolve(false);
          });
      });
  }

  public subscribe(callback: (msg: NetworkMessage) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notify(msg: NetworkMessage) {
      this.listeners.forEach(l => l(msg));
  }

  public send(type: MessageType, roomCode: string, payload: any) {
    const msg = { type, roomCode, payload };
    
    // If Host, broadcast to all phones
    if (this.connections.length > 0) {
        this.connections.forEach(conn => {
            if (conn.open) conn.send(msg);
        });
    }
    
    // If Client, send to Host
    if (this.hostConnection && this.hostConnection.open) {
        this.hostConnection.send(msg);
    }
  }
}

export const network = new NetworkService();

export const generateRoomCode = () => {
  return Math.floor(10000 + Math.random() * 90000).toString();
};