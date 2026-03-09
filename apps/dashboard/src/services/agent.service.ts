const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

export interface AgentVerifyInfo {
  display_name: string
  verification_code: string
}

export interface VerifyAgentResponse {
  agentId: string
  agentname: string
  message: string
}

export interface ApiResponse<T> {
  data?: T
  error?: {
    message: string
    code?: string
  }
}

export async function getAgentInfoByVerify(
  verifyToken: string
): Promise<ApiResponse<AgentVerifyInfo>> {
  try {
    const res = await fetch(`${API_BASE}/agents/verify/${verifyToken}`)

    if (!res.ok) {
      const error = await res.json().catch(() => ({}))
      return {
        error: {
          message: error.error || "Failed to fetch agent info",
          code: error.code,
        },
      }
    }

    const data = await res.json()
    return { data }
  } catch (error) {
    return {
      error: {
        message: error instanceof Error ? error.message : "Network error",
      },
    }
  }
}

export async function verifyAgent(
  params: {
    verify_token: string
    verify_tweet_url?: string
  },
  accessToken: string
): Promise<ApiResponse<VerifyAgentResponse>> {
  try {
    const res = await fetch(`${API_BASE}/agents/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        verificationToken: params.verify_token,
        verify_tweet_url: params.verify_tweet_url,
      }),
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({}))
      return {
        error: {
          message: error.error || "Verification failed",
          code: error.code,
        },
      }
    }

    const data = await res.json()
    return { data }
  } catch (error) {
    return {
      error: {
        message: error instanceof Error ? error.message : "Network error",
      },
    }
  }
}
