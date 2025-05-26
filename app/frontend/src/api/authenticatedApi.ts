// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { 
    ChatResponse, 
    ChatRequest, 
    AllFilesUploadStatus, 
    GetUploadStatusRequest, 
    GetInfoResponse, 
    ActiveCitation, 
    GetWarningBanner, 
    StatusLogEntry, 
    StatusLogResponse, 
    ApplicationTitle, 
    GetTagsResponse,
    DeleteItemRequest,
    ResubmitItemRequest,
    GetFeatureFlagsResponse,
    getMaxCSVFileSizeType,
    FetchCitationFileResponse,
} from "./models";
import { apiClient } from "../auth/apiClient";

// Re-export the original api functions for backward compatibility while adding authentication
export * from "./api";

/**
 * Enhanced API functions that use authenticated requests
 */

export async function chatApiAuthenticated(options: ChatRequest, signal: AbortSignal): Promise<Response> {
    const response = await apiClient.post("/chat", {
        history: options.history,
        approach: options.approach,
        overrides: {
            semantic_ranker: options.overrides?.semanticRanker,
            semantic_captions: options.overrides?.semanticCaptions,
            top: options.overrides?.top,
            temperature: options.overrides?.temperature,
            prompt_template: options.overrides?.promptTemplate,
            prompt_template_prefix: options.overrides?.promptTemplatePrefix,
            prompt_template_suffix: options.overrides?.promptTemplateSuffix,
            exclude_category: options.overrides?.excludeCategory,
            suggest_followup_questions: options.overrides?.suggestFollowupQuestions,
            byPassRAG: options.overrides?.byPassRAG,
            user_persona: options.overrides?.userPersona,
            system_persona: options.overrides?.systemPersona,
            ai_persona: options.overrides?.aiPersona,
            response_length: options.overrides?.responseLength,
            response_temp: options.overrides?.responseTemp,
            selected_folders: options.overrides?.selectedFolders,
            selected_tags: options.overrides?.selectedTags
        },
        citation_lookup: options.citation_lookup,
        thought_chain: options.thought_chain
    }, {
        // Include the abort signal
        signal
    });

    if (response.status > 299 || !response.ok) {
        throw Error("Unknown error");
    }
   
    return response;
}

export async function getAllUploadStatusAuthenticated(options: GetUploadStatusRequest): Promise<AllFilesUploadStatus> {
    const response = await apiClient.post("/getalluploadstatus", {
        timeframe: options.timeframe,
        state: options.state as string,
        folder: options.folder as string,
        tag: options.tag as string
    });
    
    const parsedResponse: any = await response.json();
    if (response.status > 299 || !response.ok) {
        throw Error(parsedResponse.error || "Unknown error");
    }
    const results: AllFilesUploadStatus = {statuses: parsedResponse};
    return results;
}

export async function deleteItemAuthenticated(options: DeleteItemRequest): Promise<boolean> {
    try {
        const response = await apiClient.post("/deleteItems", {
            path: options.path
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return true;
    } catch (error) {
        console.error('Error deleting item:', error);
        throw error;
    }
}

export async function resubmitItemAuthenticated(options: ResubmitItemRequest): Promise<boolean> {
    try {
        const response = await apiClient.post("/resubmitItems", {
            path: options.path
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return true;
    } catch (error) {
        console.error('Error resubmitting item:', error);
        throw error;
    }
}

export async function getInfoAuthenticated(): Promise<GetInfoResponse> {
    const response = await apiClient.get("/info");
    
    if (!response.ok) {
        throw Error("Failed to get info");
    }
    
    return await response.json();
}

export async function getWarningBannerAuthenticated(): Promise<GetWarningBanner> {
    const response = await apiClient.get("/warningbanner");
    
    if (!response.ok) {
        throw Error("Failed to get warning banner");
    }
    
    return await response.json();
}

export async function getApplicationTitleAuthenticated(): Promise<ApplicationTitle> {
    const response = await apiClient.get("/applicationtitle");
    
    if (!response.ok) {
        throw Error("Failed to get application title");
    }
    
    return await response.json();
}

export async function getStatusLogAuthenticated(): Promise<StatusLogResponse> {
    const response = await apiClient.get("/statuslog");
    
    if (!response.ok) {
        throw Error("Failed to get status log");
    }
    
    return await response.json();
}

export async function getTagsAuthenticated(): Promise<GetTagsResponse> {
    const response = await apiClient.get("/gettags");
    
    if (!response.ok) {
        throw Error("Failed to get tags");
    }
    
    return await response.json();
}

export async function getFeatureFlagsAuthenticated(): Promise<GetFeatureFlagsResponse> {
    const response = await apiClient.get("/getfeatureflags");
    
    if (!response.ok) {
        throw Error("Failed to get feature flags");
    }
    
    return await response.json();
}

export async function getMaxCSVFileSizeAuthenticated(): Promise<getMaxCSVFileSizeType> {
    const response = await apiClient.get("/getmaxcsvfilesize");
    
    if (!response.ok) {
        throw Error("Failed to get max CSV file size");
    }
    
    return await response.json();
}

export async function fetchCitationFileAuthenticated(citation: string): Promise<FetchCitationFileResponse> {
    const response = await apiClient.get(`/getcitationfilepath/${encodeURIComponent(citation)}`);
    
    if (!response.ok) {
        throw Error("Failed to fetch citation file");
    }
    
    return await response.json();
}

/**
 * Utility function to create FormData with authentication
 */
export async function uploadFileAuthenticated(file: File, tags: string[] = [], folder: string = ""): Promise<Response> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (tags.length > 0) {
        formData.append('tags', JSON.stringify(tags));
    }
    
    if (folder) {
        formData.append('folder', folder);
    }

    // For file uploads, we need to use the authenticated fetch directly
    // since we need to send FormData instead of JSON
    return await apiClient.authenticatedFetch('/upload', {
        method: 'POST',
        body: formData,
        headers: {
            // Don't set Content-Type for FormData, let the browser set it with boundary
        }
    });
}

/**
 * Hook to switch between authenticated and non-authenticated API calls
 * Based on authentication state
 */
export const createApiProxy = (useAuthenticated: boolean = true) => {
    return {
        chatApi: useAuthenticated ? chatApiAuthenticated : chatApiAuthenticated, // Always use authenticated for chat
        getAllUploadStatus: useAuthenticated ? getAllUploadStatusAuthenticated : getAllUploadStatusAuthenticated,
        deleteItem: useAuthenticated ? deleteItemAuthenticated : deleteItemAuthenticated,
        resubmitItem: useAuthenticated ? resubmitItemAuthenticated : resubmitItemAuthenticated,
        getInfo: useAuthenticated ? getInfoAuthenticated : getInfoAuthenticated,
        getWarningBanner: useAuthenticated ? getWarningBannerAuthenticated : getWarningBannerAuthenticated,
        getApplicationTitle: useAuthenticated ? getApplicationTitleAuthenticated : getApplicationTitleAuthenticated,
        getStatusLog: useAuthenticated ? getStatusLogAuthenticated : getStatusLogAuthenticated,
        getTags: useAuthenticated ? getTagsAuthenticated : getTagsAuthenticated,
        getFeatureFlags: useAuthenticated ? getFeatureFlagsAuthenticated : getFeatureFlagsAuthenticated,
        getMaxCSVFileSize: useAuthenticated ? getMaxCSVFileSizeAuthenticated : getMaxCSVFileSizeAuthenticated,
        fetchCitationFile: useAuthenticated ? fetchCitationFileAuthenticated : fetchCitationFileAuthenticated,
        uploadFile: useAuthenticated ? uploadFileAuthenticated : uploadFileAuthenticated,
    };
};

// Make this a module
export {};
