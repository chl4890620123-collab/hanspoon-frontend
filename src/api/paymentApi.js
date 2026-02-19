import axiosInstance from './axios';

/**
 * 결제 API
 */
export const paymentApi = {
    /**
     * 결제 준비 (PortOne)
     * @param {Object} paymentData - { amount, itemName, buyerName, buyerEmail, ... }
     * @returns {Promise<Object>}
     */
    preparePayment: async (paymentData) => {
        try {
            const response = await axiosInstance.post('/api/payment/prepare', paymentData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * 결제 검증
     * @param {Object} verifyData - { impUid, merchantUid }
     * @returns {Promise<Object>}
     */
    verifyPayment: async (verifyData) => {
        try {
            const response = await axiosInstance.post('/api/payment/verify', verifyData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * 결제 내역 조회
     * @param {Object} params - { page, size, ... }
     * @returns {Promise<Object>}
     */
    getPaymentHistory: async (params) => {
        try {
            const response = await axiosInstance.get('/api/payment/history', { params });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * 포트원 설정 정보 조회
     * @returns {Promise<Object>}
     */
    getPortOneConfig: async () => {
        try {
            const response = await axiosInstance.get('/api/payment/config');
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};
