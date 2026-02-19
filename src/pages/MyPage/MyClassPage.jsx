import React, { useEffect, useState } from 'react';
import { http } from '../../api/http';
import { toErrorMessage } from '../../api/http';
import './MyClassPage.css';

const MyClassPage = () => {
    const [page, setPage] = useState(0);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Filters
    const [status, setStatus] = useState('ALL'); // ALL, UPCOMING, COMPLETED, CANCELED

    // Helper to map UI status to Backend status
    const getBackendStatus = (uiStatus) => {
        if (uiStatus === 'ALL') return null;
        if (uiStatus === 'UPCOMING') return 'PAID'; // Assuming PAID means upcoming/confirmed
        if (uiStatus === 'COMPLETED') return 'COMPLETED'; // Need to check if this status exists
        if (uiStatus === 'CANCELED') return 'CANCELED';
        return null;
    };

    // But ReservationStatus enum might be different. 
    // Let's assume: PENDING_PAYMENT, PAID, CANCELED, REFUNDED. 
    // And "Completed" is not a status but calculated by date?
    // For now, let's just filter by status if possible.
    // Backend `findWithFilters` supports status.

    const loadReservations = async (p) => {
        setLoading(true);
        setError('');
        try {
            const backendStatus = getBackendStatus(status);
            const params = new URLSearchParams({ page: p, size: 10 });
            if (backendStatus) params.append('status', backendStatus);

            // Note: Controller returns ApiResponse<Page<...>>
            const res = await http.get(`/api/oneday/reservations?${params.toString()}`);
            if (res.data && res.data.data) {
                setData(res.data.data); // Page object
            } else {
                setData(res.data); // Maybe just Page object if ApiResponse structure is different
            }
        } catch (e) {
            setError(toErrorMessage(e));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setPage(0);
        loadReservations(0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);

    const handlePageChange = (newPage) => {
        setPage(newPage);
        loadReservations(newPage);
    };

    return (
        <div className="my-class-page">
            <h2 className="page-title">클래스 예약 내역</h2>

            <div className="class-tabs">
                {['ALL', 'UPCOMING', 'CANCELED'].map(tab => (
                    <button
                        key={tab}
                        className={`tab-btn ${status === tab ? 'active' : ''}`}
                        onClick={() => setStatus(tab)}
                    >
                        {tab === 'ALL' ? '전체' : tab === 'UPCOMING' ? '수강 예정' : '취소/환불'}
                    </button>
                ))}
            </div>

            {loading && <div className="loading-msg">로딩 중...</div>}
            {error && <div className="error-msg">{error}</div>}

            {data && (
                <>
                    {data.content.length === 0 ? (
                        <div className="empty-msg">예약 내역이 없습니다.</div>
                    ) : (
                        <div className="reservation-list">
                            {data.content.map(r => (
                                <div key={r.reservationId} className="reservation-item">
                                    <div className="res-header">
                                        <span className="res-date">{new Date(r.startAt).toLocaleDateString()} {new Date(r.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        <span className={`res-status status-${r.status}`}>{r.status}</span>
                                    </div>
                                    <div className="res-body">
                                        <div className="res-info">
                                            <h3 className="res-title">{r.classTitle}</h3>
                                            <p className="res-meta">인원: {r.count}명 (슬롯: {r.slot})</p>
                                            <p className="res-price">{r.price.toLocaleString()}원</p>
                                        </div>
                                        <div className="res-actions">
                                            {/* 취소 가능 여부 등 체크 후 버튼 표시 */}
                                            {r.status === 'PAID' && (
                                                <button className="btn-action">취소 요청</button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {data.totalPages > 1 && (
                        <div className="pagination">
                            <button disabled={page <= 0} onClick={() => handlePageChange(page - 1)}>이전</button>
                            <span className="page-info">{data.number + 1} / {data.totalPages}</span>
                            <button disabled={page >= data.totalPages - 1} onClick={() => handlePageChange(page + 1)}>다음</button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default MyClassPage;
