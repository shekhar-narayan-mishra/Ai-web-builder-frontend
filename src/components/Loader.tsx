export function Loader() {
    return (
        <div role="status" className="flex flex-col items-center justify-center w-full">
            {/* Spinner */}
            <div className="relative">
                {/* Outer ring */}
                <div className="w-12 h-12 rounded-full border-2 border-gray-800 border-t-purple-500 animate-spin"></div>
                {/* Inner ring */}
                <div className="absolute top-2 left-2 w-8 h-8 rounded-full border-2 border-gray-800 border-t-blue-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
                {/* Center dot */}
                <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
            </div>
            <span className="sr-only">Loading...</span>
        </div>
    );
}