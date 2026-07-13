import api from './api';

export interface EvidenceUploadPayload {
  emergencyId: string;
  fileUri: string;
  type: 'audio' | 'video' | 'photo';
  metadata?: any;
}

const evidenceService = {
  async uploadEvidence(payload: EvidenceUploadPayload) {
    const formData = new FormData();
    formData.append('emergencyId', payload.emergencyId);
    formData.append('type', payload.type);
    
    // Add file details
    const uriParts = payload.fileUri.split('/');
    const fileName = uriParts[uriParts.length - 1];
    
    // Determine mime type
    let mimeType = 'image/jpeg';
    if (payload.type === 'video') mimeType = 'video/mp4';
    if (payload.type === 'audio') mimeType = 'audio/m4a';

    formData.append('file', {
      uri: payload.fileUri,
      name: fileName,
      type: mimeType,
    } as any);

    if (payload.metadata) {
      formData.append('metadata', JSON.stringify(payload.metadata));
    }

    const response = await api.post('/evidence/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async getEvidence(evidenceId: string) {
    const response = await api.get(`/evidence/${evidenceId}`);
    return response.data;
  },
};

export default evidenceService;
