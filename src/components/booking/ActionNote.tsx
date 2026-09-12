interface ActionNoteProps {
  type: "reschedule" | "adjust";
}

const ActionNote = ({ type }: ActionNoteProps) => {
  if (type === "adjust") {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg">
        <p className="text-xs text-yellow-600 leading-relaxed">
          <span className="font-semibold">Note:</span> This booking is already
          active, so the date and start time can't be changed. You can only
          adjust the end time — extend it if you need more time, or reduce it
          if you're leaving early. Refunds are not applicable.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg">
      <p className="text-xs text-yellow-600 leading-relaxed">
        <span className="font-semibold">Note:</span> Future bookings can be
        rescheduled to another available date and time. You can move the
        booking earlier or later, or reduce the duration, as long as the new
        booking time is not in the past. Any eligible refunds will be initiated
        where applicable.
      </p>
    </div>
  );
};

export default ActionNote;