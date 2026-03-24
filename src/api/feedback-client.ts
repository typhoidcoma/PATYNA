export interface DirectFeedbackSubmit {
  content: string;
  source: string;
  displayName?: string;
  userId?: string;
  category?: string;
}

interface DirectFeedbackPayload {
  content: string;
  source: string;
  display_name?: string;
  user_id?: string;
  category?: string;
}

export class FeedbackClient {
  constructor(private endpointUrl?: string) {}

  isConfigured(): boolean {
    return Boolean(this.endpointUrl);
  }

  async submitFeedback(data: DirectFeedbackSubmit): Promise<boolean> {
    if (!this.endpointUrl) {
      console.warn('[FeedbackClient] Missing feedback endpoint URL');
      return false;
    }

    try {
      const resp = await fetch(this.endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.serializePayload(data)),
      });

      if (!resp.ok) {
        console.warn(`[FeedbackClient] POST failed: ${resp.status}`);
        return false;
      }

      return true;
    } catch (err) {
      console.warn('[FeedbackClient] POST failed:', err);
      return false;
    }
  }

  private serializePayload(data: DirectFeedbackSubmit): DirectFeedbackPayload {
    const payload: DirectFeedbackPayload = {
      content: data.content,
      source: data.source,
    };

    if (data.displayName) {
      payload.display_name = data.displayName;
    }

    if (data.userId) {
      payload.user_id = data.userId;
    }

    if (data.category) {
      payload.category = data.category;
    }

    return payload;
  }
}
