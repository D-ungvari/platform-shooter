const API_BASE = 'http://localhost:3001';

export async function fetchScores(limit = 10) {
    try {
        const res = await fetch(`${API_BASE}/scores?limit=${limit}`);
        if (!res.ok) return [];
        return await res.json();
    } catch {
        return [];
    }
}

export async function submitScore(name, score) {
    try {
        const res = await fetch(`${API_BASE}/scores`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, score }),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.details || err.error || 'Failed to submit score');
        }
        return await res.json();
    } catch (e) {
        console.error('Score submission failed:', e.message);
        return null;
    }
}
