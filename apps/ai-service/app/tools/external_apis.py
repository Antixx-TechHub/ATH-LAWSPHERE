"""
External API Tools for LangGraph Agent
Provides real-time data access for weather, search, and other external services.
"""

import os
import httpx
from datetime import datetime
from typing import Optional
import structlog
from langchain_core.tools import tool

logger = structlog.get_logger()

# API Keys from environment
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")
SERPAPI_KEY = os.getenv("SERPAPI_KEY", "")


@tool
async def get_weather(location: str, units: str = "metric") -> str:
    """
    Get current weather for a location.
    
    Args:
        location: City name, optionally with country code (e.g., "Pune", "Pune,IN", "New York,US")
        units: Temperature units - "metric" (Celsius) or "imperial" (Fahrenheit)
    
    Returns:
        Current weather information including temperature, conditions, humidity, and wind.
    """
    logger.info("Tool: get_weather called", location=location, units=units)
    
    # Use OpenWeatherMap API if key available
    if OPENWEATHER_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    "https://api.openweathermap.org/data/2.5/weather",
                    params={
                        "q": location,
                        "appid": OPENWEATHER_API_KEY,
                        "units": units,
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    temp = data["main"]["temp"]
                    feels_like = data["main"]["feels_like"]
                    humidity = data["main"]["humidity"]
                    description = data["weather"][0]["description"]
                    wind_speed = data["wind"]["speed"]
                    city = data["name"]
                    country = data["sys"]["country"]
                    
                    unit_symbol = "°C" if units == "metric" else "°F"
                    wind_unit = "m/s" if units == "metric" else "mph"
                    
                    return f"""**Current Weather in {city}, {country}**
- **Temperature**: {temp}{unit_symbol} (feels like {feels_like}{unit_symbol})
- **Conditions**: {description.capitalize()}
- **Humidity**: {humidity}%
- **Wind Speed**: {wind_speed} {wind_unit}
- **Retrieved at**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"""
                else:
                    logger.warning("Weather API error", status=response.status_code)
                    return f"Could not retrieve weather for '{location}'. Please check the city name and try again."
                    
        except Exception as e:
            logger.error("Weather API exception", error=str(e))
            return f"Error fetching weather data: {str(e)}"
    
    # Fallback: Use wttr.in (free, no API key required)
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"https://wttr.in/{location}?format=j1"
            )
            
            if response.status_code == 200:
                data = response.json()
                current = data["current_condition"][0]
                area = data["nearest_area"][0]
                
                city = area["areaName"][0]["value"]
                country = area["country"][0]["value"]
                temp_c = current["temp_C"]
                temp_f = current["temp_F"]
                feels_c = current["FeelsLikeC"]
                feels_f = current["FeelsLikeF"]
                humidity = current["humidity"]
                description = current["weatherDesc"][0]["value"]
                wind_kmph = current["windspeedKmph"]
                wind_mph = current["windspeedMiles"]
                
                if units == "metric":
                    return f"""**Current Weather in {city}, {country}**
- **Temperature**: {temp_c}°C (feels like {feels_c}°C)
- **Conditions**: {description}
- **Humidity**: {humidity}%
- **Wind Speed**: {wind_kmph} km/h
- **Retrieved at**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"""
                else:
                    return f"""**Current Weather in {city}, {country}**
- **Temperature**: {temp_f}°F (feels like {feels_f}°F)
- **Conditions**: {description}
- **Humidity**: {humidity}%
- **Wind Speed**: {wind_mph} mph
- **Retrieved at**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"""
            else:
                return f"Could not retrieve weather for '{location}'. Please verify the location name."
                
    except Exception as e:
        logger.error("wttr.in API exception", error=str(e))
        return f"Weather service temporarily unavailable. Please try again later."


@tool
async def web_search(query: str, num_results: int = 5) -> str:
    """
    Search the web for current information.
    
    Args:
        query: The search query
        num_results: Number of results to return (default 5, max 10)
    
    Returns:
        Search results with titles, snippets, and URLs.
    """
    logger.info("Tool: web_search called", query=query, num_results=num_results)
    
    num_results = min(num_results, 10)
    
    # Use SerpAPI if available
    if SERPAPI_KEY:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    "https://serpapi.com/search",
                    params={
                        "q": query,
                        "api_key": SERPAPI_KEY,
                        "num": num_results,
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    results = data.get("organic_results", [])[:num_results]
                    
                    if not results:
                        return f"No results found for '{query}'."
                    
                    output = f"**Web Search Results for: '{query}'**\n\n"
                    for i, result in enumerate(results, 1):
                        title = result.get("title", "No title")
                        snippet = result.get("snippet", "No description")
                        link = result.get("link", "")
                        output += f"{i}. **{title}**\n   {snippet}\n   [Link]({link})\n\n"
                    
                    return output
                    
        except Exception as e:
            logger.error("SerpAPI exception", error=str(e))
    
    # Fallback: Use DuckDuckGo Instant Answer API (free, no key)
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://api.duckduckgo.com/",
                params={
                    "q": query,
                    "format": "json",
                    "no_html": 1,
                    "skip_disambig": 1,
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check for instant answer
                abstract = data.get("AbstractText", "")
                abstract_source = data.get("AbstractSource", "")
                abstract_url = data.get("AbstractURL", "")
                
                related_topics = data.get("RelatedTopics", [])[:num_results]
                
                output = f"**Search Results for: '{query}'**\n\n"
                
                if abstract:
                    output += f"**Summary** (from {abstract_source}):\n{abstract}\n"
                    if abstract_url:
                        output += f"[Read more]({abstract_url})\n\n"
                
                if related_topics:
                    output += "**Related Information:**\n"
                    for i, topic in enumerate(related_topics, 1):
                        if isinstance(topic, dict) and "Text" in topic:
                            text = topic.get("Text", "")
                            url = topic.get("FirstURL", "")
                            output += f"{i}. {text}\n"
                            if url:
                                output += f"   [Link]({url})\n"
                
                if not abstract and not related_topics:
                    return f"No instant results found for '{query}'. Try a more specific search or rephrase your query."
                
                return output
                
    except Exception as e:
        logger.error("DuckDuckGo API exception", error=str(e))
        return f"Search service temporarily unavailable. Please try again later."


@tool
def get_current_datetime(timezone: str = "Asia/Kolkata") -> str:
    """
    Get current date and time.
    
    Args:
        timezone: Timezone name (default: Asia/Kolkata for India)
    
    Returns:
        Current date, time, and day of week.
    """
    from zoneinfo import ZoneInfo
    
    try:
        tz = ZoneInfo(timezone)
        now = datetime.now(tz)
        
        return f"""**Current Date & Time**
- **Date**: {now.strftime('%B %d, %Y')} ({now.strftime('%A')})
- **Time**: {now.strftime('%I:%M %p')} ({now.strftime('%H:%M')})
- **Timezone**: {timezone}
- **ISO Format**: {now.isoformat()}"""
    except Exception as e:
        # Fallback to local time
        now = datetime.now()
        return f"""**Current Date & Time (Local)**
- **Date**: {now.strftime('%B %d, %Y')} ({now.strftime('%A')})
- **Time**: {now.strftime('%I:%M %p')}"""


@tool
def calculate(expression: str) -> str:
    """
    Evaluate a mathematical expression safely.
    
    Args:
        expression: Mathematical expression to evaluate (e.g., "2 + 2", "100 * 1.18", "sqrt(144)")
    
    Returns:
        The result of the calculation.
    """
    import math
    
    # Safe math functions
    safe_dict = {
        "abs": abs,
        "round": round,
        "min": min,
        "max": max,
        "sum": sum,
        "pow": pow,
        "sqrt": math.sqrt,
        "sin": math.sin,
        "cos": math.cos,
        "tan": math.tan,
        "log": math.log,
        "log10": math.log10,
        "exp": math.exp,
        "pi": math.pi,
        "e": math.e,
    }
    
    try:
        # Remove any dangerous characters
        clean_expr = expression.replace("__", "").replace("import", "").replace("exec", "").replace("eval", "")
        
        # Evaluate safely
        result = eval(clean_expr, {"__builtins__": {}}, safe_dict)
        
        return f"**Calculation Result**\n`{expression}` = **{result}**"
    except Exception as e:
        return f"Could not calculate '{expression}'. Error: {str(e)}"
