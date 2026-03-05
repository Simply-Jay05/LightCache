import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { updateProduct } from "./productsSlice";

const API_URL = `${import.meta.env.VITE_BACKEND_URL}`;
const USER_TOKEN = `Bearer ${localStorage.getItem("userToken")}`;

// async thunk to fetch admin products
export const fetchAdminProducts = createAsyncThunk("adminProducts/fetchProducts", async () => {
    const response = await axios.get(`${API_URL}/admin/products`, {
        headers: {
            Authorization: USER_TOKEN,
        }
    });
    return response.data;
});

// async function to create a new product
export const createProduct = createAsyncThunk("adminProducts/createProduct", async (productData) => {
    const response = await axios.post(`${API_URL}/api/admin/products`,
        productData,
        {
            headers: {
                Authorization: USER_TOKEN,
            },
        }
    );
    return response.data;
});

// async thunk to update an existing product
export const updateProduct = createAsyncThunk("adminProducts/updateProduct", async ({id, productData}) => {
    const response = await axios.put(`${API_URL}/api/admin/products/${id}`,
        productData,
        {
            headers: {
                Authorization: USER_TOKEN,
            },
        }
    );
    return response.data;
});

// async thunk to delete a product
export const deleteProduct = createAsyncThunk()