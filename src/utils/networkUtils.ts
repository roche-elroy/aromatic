export const checkServerConnection = async (serverIP: string): Promise<boolean> => {
    try {
        const response = await fetch(`http://${serverIP}:8000/health`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.status === 'healthy';
    } catch (error) {
        console.error('Server connection check failed:', error);
        return false;
    }
};