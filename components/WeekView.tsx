
import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { CalendarEvent } from '../types';
import { getStartOfWeek, addDays, isSameDay, getRecurringEventsForWeek } from '../utils/dateUtils';
import { CheckIcon } from './Icons';

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  viewMode?: 'all' | 'morning' | 'afternoon' | 'workday' | 'night';
  onEventClick: (event: CalendarEvent) => void;
  onTimeSlotClick: (date: Date) => void;
  onUpdateEvent?: (event: CalendarEvent) => void; 
  onSwipePrev?: () => void;
  onSwipeNext?: () => void;
  onChangeDate?: (date: Date) => void;
}

// Drag State Types
type DragMode = 'move' | 'resize' | null;
interface DragState {
    eventId: string;
    mode: DragMode;
    startY: number;
    startX: number;
    originalStart: Date;
    originalEnd: Date;
    newStart: Date;
    newEnd: Date;
    dayOffset: number;
}

const MENU_COLORS = [
  { value: 'blue', class: 'bg-blue-500', ring: 'ring-blue-500' },
  { value: 'green', class: 'bg-emerald-500', ring: 'ring-emerald-500' },
  { value: 'red', class: 'bg-rose-500', ring: 'ring-rose-500' },
  { value: 'yellow', class: 'bg-amber-500', ring: 'ring-amber-500' },
  { value: 'purple', class: 'bg-violet-500', ring: 'ring-violet-500' },
  { value: 'gray', class: 'bg-slate-500', ring: 'ring-slate-500' },
  { value: 'pink', class: 'bg-pink-500', ring: 'ring-pink-500' },
  { value: 'indigo', class: 'bg-indigo-500', ring: 'ring-indigo-500' },
  { value: 'cyan', class: 'bg-cyan-500', ring: 'ring-cyan-500' },
  { value: 'orange', class: 'bg-orange-500', ring: 'ring-orange-500' },
  { value: 'teal', class: 'bg-teal-500', ring: 'ring-teal-500' },
  { value: 'lime', class: 'bg-lime-500', ring: 'ring-lime-500' },
  // Pastels
  { value: 'lavender', class: 'bg-purple-300', ring: 'ring-purple-300' }, 
  { value: 'mint', class: 'bg-emerald-200', ring: 'ring-emerald-200' },
  { value: 'peach', class: 'bg-orange-200', ring: 'ring-orange-200' },
  { value: 'sky', class: 'bg-sky-200', ring: 'ring-sky-200' },
  { value: 'blush', class: 'bg-rose-200', ring: 'ring-rose-200' },
  { value: 'canary', class: 'bg-yellow-200', ring: 'ring-yellow-200' },
];

const WeekView: React.FC<WeekViewProps> = ({ 
    currentDate, 
    events, 
    viewMode = 'all',
    onEventClick, 
    onTimeSlotClick, 
    onUpdateEvent, 
    onSwipePrev, 
    onSwipeNext 
}) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const weekStart = useMemo(() => getStartOfWeek(currentDate), [currentDate]);
  
  // Responsive: On mobile, only show the current selected day. On Desktop, show full week.
  const weekDays = useMemo(() => {
      if (isMobile) {
          return [currentDate];
      }
      return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  }, [weekStart, currentDate, isMobile]);

  // Expand events with recurrence logic
  const visibleEvents = useMemo(() => {
      const startRef = isMobile ? currentDate : weekStart;
      return getRecurringEventsForWeek(events, startRef);
  }, [events, weekStart, currentDate, isMobile]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  
  // State
  const [pxPerMinute, setPxPerMinute] = useState(0.8);
  const [now, setNow] = useState(new Date());
  
  // Dragging State
  const [dragState, setDragState] = useState<DragState | null>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; eventId: string } | null>(null);

  // Zoom Refs
  const isDraggingZoom = useRef(false);
  const dragZoomStartY = useRef(0);
  const startZoomLevel = useRef(0);

  // Swipe Refs
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Auto Scroll Refs
  const autoScrollRef = useRef<number | null>(null);

  const hasDraggedRef = useRef(false);
  const MIN_EVENT_DURATION = 15;
  const SNAP_MINUTES = 15;

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // React to viewMode prop changes
  useEffect(() => {
      if (!scrollContainerRef.current) return;

      let zoom = 0.8;
      let scrollHour = 7;

      switch (viewMode) {
        case 'morning': // 06:00 - 12:00
            zoom = 1.6; // Reduced from 2.2 to fit 6h better
            scrollHour = 6;
            break;
        case 'afternoon': // 12:00 - 18:00
            zoom = 1.6; // Reduced from 2.2
            scrollHour = 12;
            break;
        case 'workday': // 07:00 - 19:00 (Manhã e Tarde)
            zoom = 0.95; // Reduced from 1.3 to fit ~12h
            scrollHour = 7;
            break;
        case 'night': // 18:00 - 24:00
            zoom = 1.8; // Reduced from 2.2
            scrollHour = 17; // Start at 17h for context
            break;
        case 'all': // Full Day
        default:
            zoom = 0.7; // Fit more in
            scrollHour = 7; // Start at normal waking hours
            break;
      }

      setPxPerMinute(zoom);
      
      // Delay scrolling slightly to allow rendering of new height
      setTimeout(() => {
         scrollContainerRef.current?.scrollTo({ top: scrollHour * 60 * zoom, behavior: 'smooth' });
      }, 50);
  }, [viewMode]);

  // Initial scroll
  useEffect(() => {
      if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 7 * 60 * pxPerMinute;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Zoom Logic ---
  const handleMouseDownZoom = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingZoom.current = true;
    dragZoomStartY.current = e.clientY;
    startZoomLevel.current = pxPerMinute;
    window.addEventListener('mousemove', handleMouseMoveZoom);
    window.addEventListener('mouseup', handleMouseUpZoom);
    document.body.style.cursor = 'ns-resize';
  };

  const handleMouseMoveZoom = (e: MouseEvent) => {
    if (!isDraggingZoom.current) return;
    const deltaY = e.clientY - dragZoomStartY.current;
    const newZoom = Math.max(0.5, Math.min(4, startZoomLevel.current + (deltaY * 0.01)));
    setPxPerMinute(newZoom);
  };

  const handleMouseUpZoom = () => {
    isDraggingZoom.current = false;
    window.removeEventListener('mousemove', handleMouseMoveZoom);
    window.removeEventListener('mouseup', handleMouseUpZoom);
    document.body.style.cursor = '';
  };

  // --- Swipe Logic (Mobile) ---
  const handleTouchStart = (e: React.TouchEvent) => {
      touchStartX.current = e.targetTouches[0].clientX;
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
      touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
      if (!isMobile) return;
      const SWIPE_THRESHOLD = 75;
      const distance = touchStartX.current - touchEndX.current;
      
      if (Math.abs(distance) > SWIPE_THRESHOLD) {
          if (distance > 0 && onSwipeNext) {
              onSwipeNext(); // Swipe Left -> Next
          } else if (distance < 0 && onSwipePrev) {
              onSwipePrev(); // Swipe Right -> Prev
          }
      }
  };

  // --- Context Menu Logic ---
  const handleContextMenu = (e: React.MouseEvent, eventId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, eventId });
  };

  const handleColorSelect = (color: string) => {
      if (contextMenu && onUpdateEvent) {
          const evt = events.find(e => e.id === contextMenu.eventId);
          if (evt) {
              onUpdateEvent({ ...evt, color: color as any });
          }
      }
      setContextMenu(null);
  };

  // --- Overlap Layout Logic (Memoized) ---
  const getDayEventsLayout = useCallback((dayEvents: CalendarEvent[]) => {
      const sorted = [...dayEvents].sort((a, b) => {
          if (new Date(a.start).getTime() !== new Date(b.start).getTime()) {
              return new Date(a.start).getTime() - new Date(b.start).getTime();
          }
          return new Date(b.end).getTime() - new Date(b.start).getTime() - (new Date(a.end).getTime() - new Date(a.start).getTime());
      });

      const columns: CalendarEvent[][] = [];
      const eventPositions = new Map<string, { colIndex: number }>();

      sorted.forEach(evt => {
         let placed = false;
         for (let i = 0; i < columns.length; i++) {
             const col = columns[i];
             const lastInCol = col[col.length - 1];
             if (new Date(lastInCol.end).getTime() <= new Date(evt.start).getTime()) {
                 col.push(evt);
                 eventPositions.set(evt.id, { colIndex: i });
                 placed = true;
                 break;
             }
         }
         if (!placed) {
             columns.push([evt]);
             eventPositions.set(evt.id, { colIndex: columns.length - 1 });
         }
      });
      
      return sorted.map(evt => {
          const start = new Date(evt.start);
          const end = new Date(evt.end);
          const startMinutes = start.getHours() * 60 + start.getMinutes();
          const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
          
          const timeStart = start.getTime();
          const timeEnd = end.getTime();
          
          let overlappingCols = 0;
          for(const col of columns) {
             if (col.some(c => new Date(c.start).getTime() < timeEnd && new Date(c.end).getTime() > timeStart)) {
                 overlappingCols++;
             }
          }

          const myColIndex = eventPositions.get(evt.id)?.colIndex || 0;
          const widthPercent = 100 / overlappingCols;
          const leftPercent = myColIndex * widthPercent;

          // Always relative to 00:00 since we render full day
          const adjustedTop = startMinutes * pxPerMinute;

          return {
              event: evt,
              top: adjustedTop,
              height: Math.max(durationMinutes * pxPerMinute, 20),
              left: leftPercent,
              width: widthPercent,
              isVisible: true // Always visible in DOM, overflow handled by scroll
          };
      });
  }, [pxPerMinute]);

  // --- Drag & Drop / Resize Logic ---
  const handleMouseDownEvent = (e: React.MouseEvent, event: CalendarEvent, mode: DragMode) => {
      e.stopPropagation();
      // Close context menu if dragging starts
      if (contextMenu) setContextMenu(null);

      if (!onUpdateEvent) return; 
      hasDraggedRef.current = false;
      setDragState({
          eventId: event.id,
          mode,
          startY: e.clientY,
          startX: e.clientX,
          originalStart: new Date(event.start),
          originalEnd: new Date(event.end),
          newStart: new Date(event.start),
          newEnd: new Date(event.end),
          dayOffset: 0
      });
      window.addEventListener('mousemove', handleMouseMoveDrag);
      window.addEventListener('mouseup', handleMouseUpDrag);
  };

  const handleMouseMoveDrag = (e: MouseEvent) => {
      // Auto Scroll Logic
      if (scrollContainerRef.current) {
          const rect = scrollContainerRef.current.getBoundingClientRect();
          const SCROLL_ZONE = 60;
          const SCROLL_SPEED = 15;
          
          if (autoScrollRef.current) cancelAnimationFrame(autoScrollRef.current);

          const scroll = () => {
              if (e.clientY < rect.top + SCROLL_ZONE) {
                  scrollContainerRef.current!.scrollTop -= SCROLL_SPEED;
                  autoScrollRef.current = requestAnimationFrame(scroll);
              } else if (e.clientY > rect.bottom - SCROLL_ZONE) {
                  scrollContainerRef.current!.scrollTop += SCROLL_SPEED;
                  autoScrollRef.current = requestAnimationFrame(scroll);
              }
          };
          scroll();
      }

      setDragState(prev => {
          if (!prev) return null;
          if (Math.abs(e.clientX - prev.startX) > 3 || Math.abs(e.clientY - prev.startY) > 3) {
             hasDraggedRef.current = true;
          }

          const deltaY = e.clientY - prev.startY;
          const deltaMinutes = deltaY / pxPerMinute;
          const snappedDeltaMinutes = Math.round(deltaMinutes / SNAP_MINUTES) * SNAP_MINUTES;

          let dayOffset = 0;
          if (prev.mode === 'move' && gridRef.current) {
              const gridRect = gridRef.current.getBoundingClientRect();
              const numCols = isMobile ? 2 : 8; 
              const colWidth = gridRect.width / numCols; 
              const deltaX = e.clientX - prev.startX;
              dayOffset = Math.round(deltaX / colWidth);
          }

          const newStart = new Date(prev.originalStart);
          const newEnd = new Date(prev.originalEnd);

          if (prev.mode === 'move') {
             newStart.setMinutes(prev.originalStart.getMinutes() + snappedDeltaMinutes);
             newEnd.setMinutes(prev.originalEnd.getMinutes() + snappedDeltaMinutes);
             newStart.setDate(prev.originalStart.getDate() + dayOffset);
             newEnd.setDate(prev.originalEnd.getDate() + dayOffset);
          } else if (prev.mode === 'resize') {
             newEnd.setMinutes(prev.originalEnd.getMinutes() + snappedDeltaMinutes);
             if ((newEnd.getTime() - newStart.getTime()) / 60000 < MIN_EVENT_DURATION) {
                 newEnd.setTime(newStart.getTime() + MIN_EVENT_DURATION * 60000);
             }
          }

          return { ...prev, newStart, newEnd, dayOffset };
      });
  };

  const handleMouseUpDrag = () => {
      if (autoScrollRef.current) cancelAnimationFrame(autoScrollRef.current);
      
      setDragState(current => {
          if (current && onUpdateEvent) {
             const interactingEvent = visibleEvents.find(e => e.id === current.eventId);
             if (interactingEvent) {
                 if (interactingEvent.start !== current.newStart.toISOString() || interactingEvent.end !== current.newEnd.toISOString()) {
                    onUpdateEvent({
                        ...interactingEvent,
                        start: current.newStart.toISOString(),
                        end: current.newEnd.toISOString()
                    });
                 }
             }
          }
          return null;
      });
      window.removeEventListener('mousemove', handleMouseMoveDrag);
      window.removeEventListener('mouseup', handleMouseUpDrag);
  };

  const colorStyles: Record<string, string> = {
    blue: 'bg-blue-500 text-white',
    green: 'bg-emerald-500 text-white',
    red: 'bg-rose-500 text-white',
    yellow: 'bg-amber-500 text-white',
    purple: 'bg-violet-500 text-white',
    gray: 'bg-slate-500 text-white',
    pink: 'bg-pink-500 text-white',
    indigo: 'bg-indigo-500 text-white',
    cyan: 'bg-cyan-500 text-white',
    orange: 'bg-orange-500 text-white',
    teal: 'bg-teal-500 text-white',
    lime: 'bg-lime-500 text-slate-800',
    lavender: 'bg-purple-300 text-purple-900',
    mint: 'bg-emerald-200 text-emerald-900',
    peach: 'bg-orange-200 text-orange-900',
    sky: 'bg-sky-200 text-sky-900',
    blush: 'bg-rose-200 text-rose-900',
    canary: 'bg-yellow-200 text-yellow-900',
  };

  // Always show full 24h
  const hours = Array.from({ length: 24 }).map((_, i) => i);

  return (
    <>
    <div className="relative h-full w-full">
        {/* Main Card */}
        <div 
            className="flex flex-col h-full bg-[var(--bg-glass)] backdrop-blur-md rounded-[2.5rem] border border-[var(--border-color)] shadow-sm overflow-hidden animate-enter delay-200 relative select-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={() => setContextMenu(null)} // Close menu on bg click
        >
        
        {/* Header - Optimized Height (No Buttons) */}
        <div className={`grid border-b border-[var(--border-color)] bg-[var(--bg-glass-strong)] backdrop-blur-xl z-20 sticky top-0 shrink-0 ${isMobile ? 'grid-cols-[50px_1fr]' : 'grid-cols-[50px_repeat(7,1fr)]'}`}>
            {/* Left Column: GMT only */}
            <div className="text-xs font-bold text-[var(--text-muted)] text-center border-r border-[var(--border-color)] flex items-center justify-center">
                <span className="text-[9px]">GMT-3</span>
            </div>
            
            {/* Days Header */}
            {weekDays.map((day, i) => {
            const isToday = isSameDay(day, now);
            return (
                <div key={i} className={`flex flex-col items-center justify-center py-2 border-r border-[var(--border-color)] last:border-r-0 ${isToday ? 'bg-[var(--accent-bg)]' : ''}`}>
                <span className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${isToday ? 'text-[var(--accent-color)]' : 'text-[var(--text-muted)]'}`}>
                    {day.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3)}
                </span>
                <div className={`w-8 h-8 flex items-center justify-center rounded-full text-base font-serif font-bold transition-all ${isToday ? 'bg-[var(--accent-color)] text-[var(--bg-app)] shadow-lg scale-110' : 'text-[var(--text-primary)]'}`}>
                    {day.getDate()}
                </div>
                </div>
            );
            })}
        </div>

        {/* Timeline Scroll Area */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative scrollbar-hide">
            <div ref={gridRef} className={`grid relative transition-all duration-300 ease-in-out ${isMobile ? 'grid-cols-[50px_1fr]' : 'grid-cols-[50px_repeat(7,1fr)]'}`} style={{ height: `${hours.length * 60 * pxPerMinute}px` }}>
                
                {/* Hours Column - Narrower (50px) */}
                <div 
                    className="border-r border-[var(--border-color)] bg-[var(--bg-glass)] backdrop-blur-sm cursor-zoom-in hover:bg-[var(--accent-bg)] transition-colors z-20"
                    onMouseDown={handleMouseDownZoom}
                >
                    {hours.map(hour => (
                        <div key={hour} className="relative border-b border-transparent pointer-events-none" style={{ height: `${60 * pxPerMinute}px` }}> 
                            <span className="absolute -top-3 left-0 right-0 text-center text-[10px] font-medium text-[var(--text-muted)]">{hour.toString().padStart(2, '0')}:00</span>
                        </div>
                    ))}
                </div>
                
                {/* Time Markers - 06h, 12h and 18h always visible markers */}
                <div className="absolute left-[50px] right-0 pointer-events-none z-10 h-full">
                    <div className="absolute w-full border-t border-dashed border-[var(--accent-color)] opacity-60 flex items-center justify-end pr-2" style={{ top: `${6 * 60 * pxPerMinute}px` }}>
                    </div>
                    <div className="absolute w-full border-t border-dashed border-[var(--accent-color)] opacity-60 flex items-center justify-end pr-2" style={{ top: `${12 * 60 * pxPerMinute}px` }}>
                    </div>
                    <div className="absolute w-full border-t border-dashed border-[var(--accent-color)] opacity-60 flex items-center justify-end pr-2" style={{ top: `${18 * 60 * pxPerMinute}px` }}>
                    </div>
                </div>

                {/* Days Columns */}
                {weekDays.map((day, dayIndex) => {
                    const isToday = isSameDay(day, now);
                    const dayEvents = visibleEvents.filter(e => {
                        if (dragState?.eventId === e.id) {
                            return isSameDay(dragState.newStart, day);
                        }
                        return isSameDay(new Date(e.start), day);
                    });

                    // USE MEMOIZED LAYOUT
                    const layoutEvents = useMemo(() => getDayEventsLayout(dayEvents), [dayEvents, getDayEventsLayout]);
                    
                    return (
                        <div key={dayIndex} 
                            className={`relative transition-colors group ${!isToday ? 'bg-[var(--bg-app)]' : 'bg-[var(--bg-glass-strong)]'}`}
                        >
                            {/* Hour Cells */}
                            {hours.map(hour => (
                                <div key={hour} 
                                    className="w-full p-[3px] box-border" 
                                    style={{ height: `${60 * pxPerMinute}px` }}
                                    onClick={() => {
                                        const newDate = new Date(day);
                                        newDate.setHours(hour);
                                        onTimeSlotClick(newDate);
                                    }}
                                >
                                    <div className="w-full h-full rounded-lg bg-[var(--text-primary)] opacity-[0.08] transition-opacity"></div>
                                </div>
                            ))}

                            {/* Events Rendering */}
                            {layoutEvents.map(({ event, top, height, left, width, isVisible }) => {
                                if (!isVisible && !dragState) return null; // Don't render if completely out of view, unless dragging (simple optimization)

                                const isDraggingThis = dragState?.eventId === event.id;
                                const isResizing = isDraggingThis && dragState?.mode === 'resize';
                                const isInstance = event.id.includes('_instance_');
                                
                                let renderTop = top;
                                let renderHeight = height;
                                
                                if (isDraggingThis && dragState) {
                                    const start = dragState.newStart;
                                    const end = dragState.newEnd;
                                    const startMins = start.getHours() * 60 + start.getMinutes();
                                    const durationMins = (end.getTime() - start.getTime()) / 60000;
                                    
                                    // Since we always start at 00:00, offset is 0
                                    renderTop = startMins * pxPerMinute;
                                    renderHeight = durationMins * pxPerMinute;
                                }

                                const isShort = height < 40;
                                
                                return (
                                    <React.Fragment key={event.id}>
                                        {/* GHOST SNAP EVENT */}
                                        {isDraggingThis && !isResizing && (
                                            <div
                                                style={{ 
                                                    top: `${top}px`, 
                                                    height: `${height}px`,
                                                    left: `${left}%`,
                                                    width: `${width}%`,
                                                }}
                                                className={`
                                                    absolute rounded-xl p-2 border-2 border-dashed border-slate-400 bg-slate-100/50 
                                                    flex flex-col justify-start overflow-hidden pointer-events-none z-0 opacity-50
                                                    transition-all duration-300 ease-out
                                                `}
                                            >
                                                <span className="text-xs font-bold text-slate-500">Origem</span>
                                            </div>
                                        )}

                                        <div
                                            style={{ 
                                                top: `${renderTop}px`, 
                                                height: `${renderHeight}px`,
                                                left: `${left}%`,
                                                width: `${width}%`,
                                            }}
                                            className={`
                                                absolute rounded-xl shadow-sm
                                                flex flex-col overflow-hidden border border-black/5
                                                cursor-pointer
                                                ${colorStyles[event.color] || colorStyles.blue}
                                                ${isDraggingThis 
                                                    ? 'z-50 transition-none' 
                                                    : 'transition-all duration-150 z-10'
                                                }
                                                ${isInstance ? 'border-dashed' : ''}
                                                ${isShort ? 'px-1.5 py-0.5 justify-center' : 'p-2 justify-start'}
                                            `}
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                if (hasDraggedRef.current) return;
                                                onEventClick(event); 
                                            }}
                                            onContextMenu={(e) => handleContextMenu(e, event.id)}
                                            onMouseDown={(e) => handleMouseDownEvent(e, event, 'move')}
                                        >
                                            <span className={`font-bold leading-tight pointer-events-none ${isShort ? 'text-[10px] truncate w-full' : 'text-xs line-clamp-2'}`}>
                                                {(event.recurrence && event.recurrence !== 'none' || isInstance) && <span className="mr-1">↻</span>}
                                                {event.title}
                                            </span>
                                            
                                            {!isShort && (
                                                <div className="flex justify-between items-center w-full mt-0.5 pointer-events-none">
                                                    <span className="text-[10px] opacity-80 font-medium">
                                                        {(() => {
                                                            const s = isDraggingThis && dragState ? dragState.newStart : new Date(event.start);
                                                            const e = isDraggingThis && dragState ? dragState.newEnd : new Date(event.end);
                                                            const format = (d: Date) => d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
                                                            return `${format(s)} - ${format(e)}`;
                                                        })()}
                                                    </span>
                                                </div>
                                            )}
                                            
                                            <div 
                                                className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize z-20"
                                                onMouseDown={(e) => handleMouseDownEvent(e, event, 'resize')}
                                            >
                                            </div>
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                            
                            {isToday && (
                                <div 
                                    className="absolute left-0 right-0 border-t-2 border-red-500 z-30 pointer-events-none flex items-center shadow-[0_0_15px_rgba(239,68,68,0.6)]"
                                    style={{ top: `${(now.getHours() * 60 + now.getMinutes()) * pxPerMinute}px` }}
                                >
                                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full -ml-1.5 animate-pulse shadow-md ring-2 ring-red-200"></div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
        </div>
    </div>

    {/* Context Menu Overlay */}
    {contextMenu && (
        <div 
            className="fixed inset-0 z-[60] bg-transparent"
            onClick={() => setContextMenu(null)}
        >
            <div 
                className="absolute z-[70] bg-[var(--bg-glass-strong)] backdrop-blur-xl border border-[var(--border-color)] rounded-2xl shadow-2xl p-3 grid grid-cols-6 gap-2 animate-enter"
                style={{ top: contextMenu.y, left: Math.min(contextMenu.x, window.innerWidth - 260) }}
                onClick={(e) => e.stopPropagation()}
            >
                {MENU_COLORS.map(c => {
                    const activeEvent = visibleEvents.find(e => e.id === contextMenu.eventId);
                    const isActive = activeEvent?.color === c.value;
                    return (
                        <button
                            key={c.value}
                            onClick={() => handleColorSelect(c.value)}
                            className={`w-6 h-6 rounded-full ${c.class} hover:scale-110 transition-transform shadow-sm flex items-center justify-center`}
                            title={c.value}
                        >
                            {isActive && <CheckIcon className="w-3 h-3 text-white/90" />}
                        </button>
                    );
                })}
            </div>
        </div>
    )}
    </>
  );
};

export default WeekView;
