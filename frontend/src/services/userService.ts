import { api } from "./Api";

export interface UserProfile {
    id: string;
    email: string;
    fullName: string;
    profilePic?: string;
    status?: string;
    createdAt?: string;
}

const userService = {
    getProfile: async (): Promise<UserProfile> => {
        const response = await api.get("/users/me");
        return response.data;
    },

    updateProfile: async (data: FormData): Promise<UserProfile> => {
        const response = await api.put("/users/me", data, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    },

    getAllUsers: async (): Promise<UserProfile[]> => {
        const response = await api.get("/users");
        return response.data;
    },

    getUserById: async (id: string): Promise<UserProfile> => {
        const response = await api.get(`/users/${id}`);
        return response.data;
    }
};

export default userService;
