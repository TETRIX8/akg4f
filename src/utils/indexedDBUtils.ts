
interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface ChatSession {
  id: string;
  name: string;
  model: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

class ChatDB {
  private dbName = 'AkProjectDB';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create sessions store
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionsStore = db.createObjectStore('sessions', { keyPath: 'id' });
          sessionsStore.createIndex('created_at', 'created_at');
        }

        // Create messages store
        if (!db.objectStoreNames.contains('messages')) {
          const messagesStore = db.createObjectStore('messages', { keyPath: 'id' });
          messagesStore.createIndex('session_id', 'session_id');
          messagesStore.createIndex('created_at', 'created_at');
        }
      };
    });
  }

  async saveSession(session: ChatSession): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sessions'], 'readwrite');
      const store = transaction.objectStore('sessions');
      const request = store.put(session);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async saveMessage(message: ChatMessage): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readwrite');
      const store = transaction.objectStore('messages');
      const request = store.put(message);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getSessions(): Promise<ChatSession[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sessions'], 'readonly');
      const store = transaction.objectStore('sessions');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const sessions = request.result.sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
        resolve(sessions);
      };
    });
  }

  async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readonly');
      const store = transaction.objectStore('messages');
      const index = store.index('session_id');
      const request = index.getAll(sessionId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const messages = request.result.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        resolve(messages);
      };
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sessions', 'messages'], 'readwrite');
      
      // Delete session
      const sessionsStore = transaction.objectStore('sessions');
      sessionsStore.delete(sessionId);
      
      // Delete all messages for this session
      const messagesStore = transaction.objectStore('messages');
      const index = messagesStore.index('session_id');
      const request = index.openCursor(sessionId);
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          messagesStore.delete(cursor.primaryKey);
          cursor.continue();
        }
      };

      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();
    });
  }

  async getStorageSize(): Promise<{ sessions: number; messages: number; total: number }> {
    if (!this.db) await this.init();
    
    const [sessions, messages] = await Promise.all([
      this.getSessions(),
      this.getAllMessages()
    ]);

    const sessionsSize = JSON.stringify(sessions).length;
    const messagesSize = JSON.stringify(messages).length;
    
    return {
      sessions: sessionsSize,
      messages: messagesSize,
      total: sessionsSize + messagesSize
    };
  }

  private async getAllMessages(): Promise<ChatMessage[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readonly');
      const store = transaction.objectStore('messages');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async clearAllData(): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sessions', 'messages'], 'readwrite');
      
      transaction.objectStore('sessions').clear();
      transaction.objectStore('messages').clear();

      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();
    });
  }
}

export const chatDB = new ChatDB();
