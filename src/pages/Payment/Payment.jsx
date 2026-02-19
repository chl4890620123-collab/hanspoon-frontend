import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentApi } from '../../api';
import { formatPhoneNumber } from '../../utils/format';
import './Payment.css';

function Payment() {
    const navigate = useNavigate();
    const [paymentMethod, setPaymentMethod] = useState('card');
    const [formData, setFormData] = useState({
        itemName: '원데이 클래스',
        amount: 50000,
        buyerName: '',
        buyerEmail: '',
        buyerTel: ''
    });
    const [loading, setLoading] = useState(false);

    const [portOneConfig, setPortOneConfig] = useState(null);

    // 1. 포트원 설정 가져오기
    useEffect(() => {
        if (!paymentApi) {
            return;
        }
        const fetchConfig = async () => {
            try {
                const response = await paymentApi.getPortOneConfig();
                if (response.success) {
                    setPortOneConfig(response.data);
                }
            } catch (error) {
                console.error('포트원 설정을 불러오는데 실패했습니다.', error);
                if (error.response && error.response.status === 401) {
                    alert('로그인이 필요한 서비스입니다.');
                    navigate('/login');
                }
            }
        };
        fetchConfig();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: name === 'buyerTel' ? formatPhoneNumber(value) : value
        });
    };
    const storeId = import.meta.env.VITE_PORTONE_STORE_ID;
    console.log('storeId:', storeId); // 값 확인
    const handlePayment = async (e) => {
        e.preventDefault();

        if (!portOneConfig) {
            alert('결제 설정을 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
            return;
        }

        // 이메일 정규식 검사 (PortOne V2는 Strict 함)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.buyerEmail)) {
            alert('올바른 이메일 형식을 입력해주세요. (예: test@email.com)');
            return;
        }

        setLoading(true);

        try {
            // 2. 백엔드에 결제 준비 요청 (주문번호 발급)
            const prepareResult = await paymentApi.preparePayment({
                ...formData,
                paymentMethod
            });

            if (!prepareResult.success) {
                alert(prepareResult.message || '결제 준비에 실패했습니다.');
                setLoading(false);
                return;
            }

            const { merchantUid } = prepareResult.data;

            // 3. 포트원 V2 결제 요청
            const loaded = window.PortOne;
            if (!loaded) {
                alert('결제 모듈을 불러올 수 없습니다. 페이지를 새로고침해주세요.');
                setLoading(false);
                return;
            }

            // 결제 수단에 따른 채널 키 선택
            // 결제 수단에 따른 채널 키 및 결제 방식 선택
            // ENV 기반으로 완전 분리
            const storeId = import.meta.env.VITE_PORTONE_STORE_ID;

            let channelKey;
            let payMethodType = "CARD";

            if (paymentMethod === 'kakaopay') {
                channelKey = import.meta.env.VITE_CHANNEL_KEY_KAKAO;
                payMethodType = "EASY_PAY";
            } else if (paymentMethod === 'tosspay') {
                channelKey = import.meta.env.VITE_CHANNEL_KEY_TOSS;
                payMethodType = "EASY_PAY";
            } else {
                channelKey = import.meta.env.VITE_CHANNEL_KEY_TOSS_PAYMENTS;
                payMethodType = "CARD";
            }

            console.log("최종 channelKey:", channelKey);
            console.log("typeof:", typeof channelKey);


            console.log("ENV 전체:", import.meta.env);
            console.log("STORE:", import.meta.env.VITE_PORTONE_STORE_ID);
            console.log("KAKAO:", import.meta.env.VITE_CHANNEL_KEY_KAKAO);
            console.log("TOSS:", import.meta.env.VITE_CHANNEL_KEY_TOSS);
            console.log("TOSS_PAY:", import.meta.env.VITE_CHANNEL_KEY_TOSS_PAYMENTS);




            const response = await window.PortOne.requestPayment({
                storeId: import.meta.env.VITE_PORTONE_STORE_ID,
                channelKey: channelKey,
                paymentId: merchantUid, // 주문번호를 결제 ID로 사용
                orderName: formData.itemName,
                totalAmount: Number(formData.amount), // 숫자로 형변환 필수
                currency: "KRW",
                payMethod: payMethodType,
                customer: {
                    fullName: formData.buyerName,
                    email: formData.buyerEmail,
                    phoneNumber: formData.buyerTel.replace(/-/g, ''), // 숫자만 전송
                }
            });


            if (response.code != null) {
                // 결제 실패 (code가 존재하면 오류)
                console.error('결제 실패:', response);
                alert(`결제 실패: ${response.message}`);
                setLoading(false);
                return;
            }

            // 4. 백엔드 결제 검증 (V2는 paymentId가 merchantUid와 동일하게 사용됨)
            try {
                const verifyResult = await paymentApi.verifyPayment({
                    paymentId: response.paymentId, // 포트원 결제 ID
                    orderId: merchantUid,
                    amount: formData.amount,
                    productId: null,
                    classId: 1,
                    quantity: 1
                });

                if (verifyResult.success) {
                    navigate('/payment/success', {
                        state: { paymentData: verifyResult.data }
                    });
                } else {
                    console.error('검증 실패:', verifyResult);
                    alert(`결제 검증 실패: ${verifyResult.message}`);
                    navigate('/payment/fail', {
                        state: { message: verifyResult.message }
                    });
                }
            } catch (error) {
                const errorMessage = error.message || '결제 검증 중 오류가 발생했습니다.';
                console.error('검증 API 호출 에러:', error);
                alert(`결제 검증 중 에러가 발생했습니다: ${errorMessage}`);
                navigate('/payment/fail', {
                    state: { message: errorMessage }
                });
            }
            setLoading(false);
        } catch (error) {
            console.error(error);
            alert(error.message || '결제 처리 중 오류가 발생했습니다.');
            setLoading(false);
        }
    };

    return (
        <div className="payment-page">
            <div className="container">
                <div className="payment-container">
                    <div className="payment-card">
                        <h1 className="payment-title">결제하기</h1>
                        <p className="payment-subtitle">안전하고 간편한 결제</p>

                        <form onSubmit={handlePayment} className="payment-form">
                            <div className="form-section">
                                <h3 className="section-title">상품 정보</h3>
                                <div className="form-group">
                                    <label className="form-label">상품명</label>
                                    <input
                                        type="text"
                                        name="itemName"
                                        className="form-input"
                                        value={formData.itemName}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">결제 금액</label>
                                    <input
                                        type="number"
                                        name="amount"
                                        className="form-input"
                                        value={formData.amount}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-section">
                                <h3 className="section-title">구매자 정보</h3>
                                <div className="form-group">
                                    <label className="form-label">이름</label>
                                    <input
                                        type="text"
                                        name="buyerName"
                                        className="form-input"
                                        placeholder="홍길동"
                                        value={formData.buyerName}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">이메일</label>
                                    <input
                                        type="email"
                                        name="buyerEmail"
                                        className="form-input"
                                        placeholder="example@email.com"
                                        value={formData.buyerEmail}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">전화번호</label>
                                    <input
                                        type="tel"
                                        name="buyerTel"
                                        className="form-input"
                                        placeholder="010-1234-5678"
                                        value={formData.buyerTel}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-section">
                                <h3 className="section-title">결제 수단</h3>
                                <div className="payment-methods">
                                    <label className="payment-method-option">
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value="card"
                                            checked={paymentMethod === 'card'}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                        />
                                        <span className="method-icon">💳</span>
                                        <span>신용/체크카드</span>
                                    </label>
                                    <label className="payment-method-option">
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value="kakaopay"
                                            checked={paymentMethod === 'kakaopay'}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                        />
                                        <span className="method-icon">💛</span>
                                        <span>카카오페이</span>
                                    </label>
                                    <label className="payment-method-option">
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value="tosspay"
                                            checked={paymentMethod === 'tosspay'}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                        />
                                        <span className="method-icon">💙</span>
                                        <span>토스페이</span>
                                    </label>

                                </div>
                            </div>

                            <div className="payment-summary">
                                <div className="summary-row">
                                    <span>총 결제금액</span>
                                    <strong className="total-amount">
                                        {formData.amount.toLocaleString()}원
                                    </strong>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary btn-full btn-large"
                                disabled={loading}
                            >
                                {loading ? '결제 진행 중...' : `${formData.amount.toLocaleString()}원 결제하기`}
                            </button>
                        </form>

                        <div className="payment-notice">
                            <p>• 결제 시 개인정보는 안전하게 암호화되어 전송됩니다.</p>
                            <p>• 결제 후 7일 이내 환불이 가능합니다.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Payment;
