import { useCallback, useEffect, useState } from 'react';
import { todayIsoLocal } from '@/shared/utils/localDate';
import type { Booking } from '@/core/types/schedule';
import type { BookingFormSnapshot } from './validateBookingCreate';

const defaultDate = () => todayIsoLocal();

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
  const [visibility, setVisibility] = useState<'PUBLIC' | 'FREE_BUSY_ONLY' | 'PRIVATE'>('PUBLIC');
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
      visibility,
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
    visibility,
  ]);

  const openCreateModal = useCallback(() => {
    setRoomId('');
    setSkinCondition('');
    setChartNote('');
    setVisibility('PUBLIC');
    setIsModalOpen(true);
  }, []);

  const openCreateModalWithSlot = useCallback(
    (slot: { date?: string; time?: string; staffId?: string; roomId?: string }) => {
      if (slot.date) setDate(slot.date);
      if (slot.time) setTime(slot.time);
      if (slot.staffId && (!opts.isScoped || opts.staffId === slot.staffId)) {
        setFormStaffId(slot.staffId);
      }
      if (slot.roomId) setRoomId(slot.roomId);
      setSkinCondition('');
      setChartNote('');
      setVisibility('PUBLIC');
      setIsModalOpen(true);
    },
    [opts.isScoped, opts.staffId]
  );

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
    openCreateModalWithSlot,
    closeCreateModal,
    visibility,
    setVisibility,
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
