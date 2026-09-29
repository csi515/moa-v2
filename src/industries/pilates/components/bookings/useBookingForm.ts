import { useCallback, useEffect, useState } from 'react';
import type { Booking } from '@/core/types/schedule';
import type { BookingFormSnapshot } from './validateBookingCreate';

const defaultDate = () => new Date().toISOString().slice(0, 10);

export function useBookingForm(opts: {
  isScoped: boolean;
  staffId: string | null | undefined;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [formStaffId, setFormStaffId] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('10:00');
  const [roomId, setRoomId] = useState('');
  const [skinCondition, setSkinCondition] = useState('');
  const [chartNote, setChartNote] = useState('');
  const [slotCapacity, setSlotCapacity] = useState('1');
  const [chartTarget, setChartTarget] = useState<Booking | null>(null);

  useEffect(() => {
    if (opts.isScoped && opts.staffId) {
      setFormStaffId(opts.staffId);
    }
  }, [opts.isScoped, opts.staffId]);

  const resolvedFormStaffId = formStaffId || opts.staffId || '';

  const snapshot = useCallback((): BookingFormSnapshot => {
    return {
      memberId,
      serviceId,
      staffId: resolvedFormStaffId,
      date,
      time,
      roomId,
      slotCapacity,
      skinCondition,
      chartNote,
    };
  }, [
    memberId,
    serviceId,
    resolvedFormStaffId,
    date,
    time,
    roomId,
    slotCapacity,
    skinCondition,
    chartNote,
  ]);

  const openCreateModal = useCallback(() => {
    setRoomId('');
    setSkinCondition('');
    setChartNote('');
    setIsModalOpen(true);
  }, []);

  const closeCreateModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const openChart = useCallback((booking: Booking) => {
    setChartTarget(booking);
    setSkinCondition(booking.skinCondition || '');
    setChartNote(booking.chartNote || '');
  }, []);

  const closeChart = useCallback(() => {
    setChartTarget(null);
  }, []);

  return {
    isModalOpen,
    openCreateModal,
    closeCreateModal,
    memberId,
    setMemberId,
    serviceId,
    setServiceId,
    formStaffId,
    setFormStaffId,
    resolvedFormStaffId,
    date,
    setDate,
    time,
    setTime,
    roomId,
    setRoomId,
    skinCondition,
    setSkinCondition,
    chartNote,
    setChartNote,
    slotCapacity,
    setSlotCapacity,
    chartTarget,
    openChart,
    closeChart,
    snapshot,
  };
}
