import React from "react";

const CallUI = ({ callState, onAccept, onReject }) => {
  if (!callState) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-lg flex items-center justify-center z-50">
      <div className="bg-white/10 border border-white/20 p-6 rounded-2xl text-center text-white space-y-4">
        <h2 className="text-xl font-semibold">Incoming Call</h2>
        <p className="opacity-80">{callState.fromUserId} is calling...</p>

        <div className="flex justify-center gap-4">
          <button
            onClick={onAccept}
            className="bg-green-500 px-5 py-2 rounded-full"
          >
            Accept
          </button>
          <button
            onClick={onReject}
            className="bg-red-500 px-5 py-2 rounded-full"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallUI;
