import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'
import { DndContext } from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';

const server = 'http://localhost:3001'


const recommendationIcons = { 'U': '🚫', 'A': '⭐', 'B': '👍', 'C': '🤔', 'D': '👎' }
const recommendationColors = { 'U': 'gray', 'A': 'darkgreen', 'B': 'green', 'C': '#555555', 'D': 'crimson' }

function NameBox({ first, last }) {

  return (
    <div style={{
      textAlign: 'left'
    }}>
      <div>{first.toUpperCase()}</div>
      <div>{last.toLowerCase()}</div>
    </div>
  );
}

function Recommendation({ recommender, score }) {

  const [first, ...rest] = recommender.split(" ")

  const portrait = `portraits/${first}.jpg`



  return (
    <div>
      <div style={{
        textAlign: 'left'
      }}>
        <img src={portrait} style={{ width: "40px" }}></img>
      </div>
      <div style={{
        backgroundColor: recommendationColors[score]
      }}>
        {recommendationIcons[score]}
      </div>
    </div>
  );
}


function Applicant(props) {
  const [first, ...rest] = props.name.split(" ")
  const last = rest.join(" ")

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: props.id,
  });
  const basicStyle = {
    backgroundColor: props.rating === "A" ? "chartreuse" : props.rating === "B" ? "goldenrod" : "whitesmoke",
    width: '100%',
    borderStyle: 'solid',
    padding: '2px',
    height: '80px',
    columnGap: '10px',
    display: 'flex',
    flexFlow: 'row nowrap',
    fontFamily: 'Arial Narrow',
    justifyContent: 'flex-start',
    alignItems: 'center',
    alignContent: 'flex-start'
  };

  const getSortedScores = () => {
    if (props.scores) {
      let sorted = props.scores
      sorted.sort((x, y) => x[1].charCodeAt(0) - y[1].charCodeAt(0))
      return sorted
    } else {
      return []
    }

  }

  const style = transform && !props.moving ? {
    ...basicStyle,
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : basicStyle


  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <div style={{
        flexGrow: 0,
        flexShrink: 0,
      }}>
        <NameBox first={first} last={last} />

      </div>
      {getSortedScores().map(score =>
        <Recommendation key={score[0]} recommender={score[0]} score={score[1]} />
      )}


    </div>
  );
}


const Course = ({ number, name }) => {
  return (
    <div className="course" style={{
      textAlign: "center",
      fontSize: "40pt",
      paddingTop: "40px",
      paddingBottom: "40px",
      paddingLeft: "20px",
      paddingRight: "20px",
      borderStyle: "solid",
      alignSelf: 'center',
    }}>
      <div style={{ fontFamily: 'Optima', color: 'chartreuse' }}>csci</div>
      <div style={{ fontFamily: 'Optima' }}>{number}</div>
    </div>
  )
}

const Recommender = ({ name }) => {
  const [first, ..._] = name.split(" ")
  const portrait = `portraits/${first}.jpg`
  const fontSize = `${Math.min(40, 42 - 2 * first.length)}pt`
  return (
    <div style={{
      textAlign: "center",
      fontSize: fontSize,
      borderColor: "darkgreen",
      borderStyle: "solid",
      alignSelf: 'stretch',
    }}>
      <img src={portrait} style={{ width: "150px" }}></img>
      <div style={{ color: 'darkgreen' }}>{first}</div>
    </div>
  )
}


const ApplicantList = (props) => {

  const { isOver, setNodeRef } = useDroppable({
    id: props.id,
  });

  return (
    <div ref={setNodeRef} style={{
      width: "200px",
      flexGrow: 1,
      flexShrink: 1
    }}>
      <span style={{ fontSize: '40px' }}>{isOver ? props.titleAlt : props.title}</span>
      <div style={{
        display: 'flex',
        flexFlow: 'column nowrap',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        alignContent: 'stretch',
        gap: '4px'
      }}>
        {props.children.map((child) => (
          <div key={child.key} style={{
            flexGrow: 1,
            flexShrink: 1,
          }}>
            {child}
          </div>
        ))}
      </div>
    </div>
  )
}

const OktaPrefer = ({ course }) => {

  const [allApplicants, setAllApplicants] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [applicants, setApplicants] = useState([])
  const [moving, setMoving] = useState(false)

  const ratings = ['A', 'B', 'C'];

  useEffect(() => {
    axios
      .get(`${server}/applicants`)
      .then(response => {
        setAllApplicants(response.data)
      })
    axios
      .get(`${server}/courses`)
      .then(response => {
        setApplicants(response.data.find(x => x.id === course).applicants)
      })
    axios
      .get(`${server}/recommendations`)
      .then(response => {
        setRecommendations(response.data)
      })
  }, [])

  const computeRecommendationsByApplicant = () => {
    let entries = Object.entries(recommendations);
    let recs = {};
    entries.forEach(entry => {
      let recommender = entry[0];
      let scores = entry[1];
      Object.entries(scores).forEach(score => {
        let unixId = score[0];
        let grade = score[1];
        if (!(unixId in recs)) {
          recs[unixId] = []
        }
        if (grade != "U") {
          recs[unixId] = recs[unixId].concat([[recommender, grade]])
        }
      })
    })
    return recs
  }

  const recsByApplicant = computeRecommendationsByApplicant()
  const getRecs = applicantId => {
    if (applicantId in recsByApplicant) {
      return recsByApplicant[applicantId]
    } else {
      return []
    }
  }

  const applicantEmails = applicants.map(applicant => applicant.id)
  const applicantAndRating = applicants.map(applicant =>
    [applicant.id, applicant.rating]
  )
  const applicantRatings = {};
  applicantAndRating.forEach(value => {
    applicantRatings[value[0]] = value[1]
  })

  const ratedApplicants = (allApplicants
    ? allApplicants
      .filter(applicant =>
        applicantEmails.includes(applicant.id)
      )
      .map(applicant => {
        return { ...applicant, rating: 'A' } //change
      })
    : [])


  const findByRating = (rating) => {
    if (ratedApplicants) {
      return ratedApplicants.filter(applicant =>
        applicantRatings[applicant.id] === rating
      )
    } else {
      return []
    }
  }

  function handleDragMove(event) { // update locally
    const { active, over } = event;
    if (over) {
      moveApplicant(active.id, over.id)
    }
  }

  function handleDragEnd(event) { // update the server
    const { over } = event;
    if (over) {
      const url = `${server}/courses/${course}`
      axios
        .get(url)
        .then(response => {
          let original = response.data
          const changed = { ...original, applicants: applicants }
          axios.put(url, changed)
        })

    }
  }

  const moveApplicant = (applicantId, rating) => {
    let revised = applicants.map(applicant => { // TODO: is there a better way? does it really matter?
      return applicant.id === applicantId ? { ...applicant, rating: rating } : applicant
    })
    // TODO: experiment to get rid of flicker
    setMoving(true)
    setApplicants(revised)
    setTimeout(() => {
      setMoving(false)
    }, 0)

  }

  return (
    <div>
      <DndContext onDragOver={handleDragMove} onDragEnd={handleDragEnd}>
        <div style={{
          width: '100%',
          height: 'inherit',
          padding: '2px',
          columnGap: '10px',
          display: 'flex',
          flexFlow: 'row nowrap',
          fontFamily: 'Latin Modern Math',
          justifyContent: 'stretch',
          alignItems: 'stretch',
          alignContent: 'center'
        }}>
          <Course name="Algorithms" number={course} style={{
            flexGrow: 1,
            flexShrink: 1,
            height: '100%',
            width: '100px'
          }} />
          {ratings.map((id) => (
            // We updated the Droppable component so it would accept an `id`
            // prop and pass it to `useDroppable`
            <ApplicantList
              key={id}
              id={id}
              title={id === "A" ? "😊" : id === "B" ? "😐" : "😔"}
              titleAlt={id === "A" ? "😲" : id === "B" ? "🤨" : "😭"}
              style={{
                flexGrow: 1,
                flexShrink: 1,
              }}>
              {findByRating(id).map(applicant => (
                <div key={applicant.id}>
                  <Applicant
                    key={applicant.id}
                    id={applicant.id}
                    name={applicant.name}
                    moving={moving}
                    scores={getRecs(applicant.id)}
                  />
                </div>
              ))}
            </ApplicantList>
          ))}


        </div>
      </DndContext>
    </div>
  )

}

const OktaRefer = ({ recommender }) => {

  const [allApplicants, setAllApplicants] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const ratings = ['U', 'A', 'B', 'C', 'D'];

  useEffect(() => {
    axios
      .get(`${server}/applicants`)
      .then(response => {
        setAllApplicants(response.data)
      })
    axios
      .get(`${server}/recommendations`)
      .then(response => {
        setRecommendations(response.data[recommender])
      })
  }, [])

  const relevantApplicants = (
    allApplicants
      .filter(applicant => Object.keys(recommendations).includes(applicant.id))
  )

  const findByRating = (rating) => {
    return relevantApplicants.filter(applicant => {
      return recommendations[applicant.id] === rating
    })
  }

  const moveApplicant = (applicantId, rating) => {
    let revised = { ...recommendations, [applicantId]: rating }
    setRecommendations(revised)
  }

  function handleDragMove(event) { // update locally
    const { active, over } = event;
    if (over) {
      moveApplicant(active.id, over.id)
    }
  }

  const handleDragEnd = (event) => { // update the server
    const { over } = event;
    if (over) {
      const url = `${server}/recommendations`
      axios
        .get(url)
        .then(response => {
          let revised = response.data
          revised[recommender] = recommendations
          axios.put(url, revised)
        })

    }
  }

  return (
    <div>
      <DndContext onDragOver={handleDragMove} onDragEnd={handleDragEnd}>
        <div style={{
          width: '100%',
          height: 'inherit',
          padding: '2px',
          columnGap: '10px',
          display: 'flex',
          flexFlow: 'row nowrap',
          fontFamily: 'Latin Modern Math',
          justifyContent: 'stretch',
          alignItems: 'stretch',
          alignContent: 'center'
        }}>
          <Recommender name={recommender} style={{
            flexGrow: 1,
            flexShrink: 1,
            height: '100%',
            width: '100px'
          }} />
          {ratings.map((id) => (
            // We updated the Droppable component so it would accept an `id`
            // prop and pass it to `useDroppable`
            <ApplicantList
              key={id}
              id={id}
              title={recommendationIcons[id]}
              titleAlt={recommendationIcons[id]}
              style={{
                flexGrow: 1,
                flexShrink: 1,
              }}>
              {findByRating(id).map(applicant => (
                <div key={applicant.id}>
                  <Applicant
                    key={applicant.id}
                    id={applicant.id}
                    name={applicant.name}
                    scores={applicant.scores}
                  />
                </div>
              ))}
            </ApplicantList>
          ))}

        </div>
      </DndContext>
    </div>
  )
}

const CourseRoster = ({ number, children }) => {

  return (
    <div style={{
      flexGrow: 1,
      flexShrink: 1,
    }}>
      <div style={{
        display: 'flex',
        flexFlow: 'column nowrap',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        alignContent: 'stretch',
        gap: '10px',
      }}>
        <div className="course" style={{
          textAlign: "center",
          fontSize: "40pt",
          padding: "10px",
          flexGrow: 1,
          flexShrink: 1,
          border: "solid 5px",
          borderColor: "coral",
          alignSelf: 'stretch',
        }}>
          <div
            style={{
              fontFamily: 'Optima',
            }}
          >{number}</div>
        </div>
        {children}
      </div>
    </div>
  )
}


function Candidate({ id, name, scores, initialStatus, onChange }) {

  const [status, setStatus] = useState(initialStatus)
  const [isOverButton, setIsOverButton] = useState(false)


  const getSortedScores = () => {
    if (scores) {
      let sorted = scores
      sorted.sort((x, y) => x[1].charCodeAt(0) - y[1].charCodeAt(0))
      return sorted
    } else {
      return []
    }
  }

  const backgroundColor = (
    status === "approved"
      ? "#ddffdd"
      : (status === "declined" ? "#ffdddd" : "whitesmoke")
  )

  const statusIndicator = (
    status === "approved"
      ? "✔️"
      : (status === "declined" ? "❌" : "❓")
  )

  const toggleStatus = () => {
    let newStatus = "approved"
    if (status === "approved") {
      newStatus = "declined"
    } else if (status === "declined") {
      newStatus = "tentative"
    }
    setStatus(newStatus)
    onChange(id, newStatus)
  }

  return (
    <div
      onMouseEnter={() => setIsOverButton(true)}
      onMouseLeave={() => setIsOverButton(false)}
      onClick={toggleStatus}
      style={{
        backgroundColor: backgroundColor,
        width: '100%',
        borderStyle: 'solid',
        padding: '5px',
        height: 'auto',
        fontFamily: 'Arial Narrow',
        textAlign: 'left',
      }}>

      <div style={{
        padding: '4px'
      }}>
        <span
          style={{
            borderStyle: isOverButton ? 'dotted' : 'solid'
          }}>
          {statusIndicator}
        </span>
        <span style={{
          padding: '4px'
        }}>
          {name.toUpperCase()}
        </span>
      </div>
      <div style={{
        display: 'flex',
        flexFlow: 'row wrap',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        alignContent: 'flex-start',
        textAlign: 'center'
      }}>
        {getSortedScores().map(score =>
          <Recommendation key={score[0]} recommender={score[0]} score={score[1]} />
        )}
      </div>
    </div>
  );
}


const OktaVerify = () => {

  const [courses, setCourses] = useState([])
  const [applicants, setApplicants] = useState([])
  const [recommendations, setRecommendations] = useState([])

  useEffect(() => {
    axios
      .get(`${server}/applicants`)
      .then(response => {
        setApplicants(response.data)
      })
    axios
      .get(`${server}/courses`)
      .then(response => {
        let sortedCourses = response.data
        sortedCourses.sort((x, y) => x.id - y.id)
        setCourses(sortedCourses)
      })
    axios
      .get(`${server}/recommendations`)
      .then(response => {
        setRecommendations(response.data)
      })
  }, [])

  const updateServer = (courseId, applicantId, status) => {
    const url = `${server}/courses/${courseId}`
    axios
      .get(url)
      .then(response => {
        let original = response.data
        let revised = response.data.roster.map(item =>
          item.id === applicantId ? { ...item, status: status } : item
        )
        axios.put(url, { ...original, roster: revised })
      })
  }

  const getCourseRoster = courseId => {
    let course = courses.find(x => x.id === courseId)
    if (course.roster) {
      let result = course.roster
        //.filter(x => applicants.find(x => x.id === applicant.id))
        .map(applicant => {
          let app = applicants.find(x => x.id === applicant.id)
          if (app === undefined) {
            return null
          }
          return {...app, status: applicant.status}
        }).filter(x => x != null)
                
      return result
    } else {
      return []
    }
  }

  const computeRecommendationsByApplicant = () => {
    let entries = Object.entries(recommendations);
    let recs = {};
    entries.forEach(entry => {
      let recommender = entry[0];
      let scores = entry[1];
      Object.entries(scores).forEach(score => {
        let unixId = score[0];
        let grade = score[1];
        if (!(unixId in recs)) {
          recs[unixId] = []
        }
        if (grade != "U") {
          recs[unixId] = recs[unixId].concat([[recommender, grade]])
        }
      })
    })
    return recs
  }

  const recsByApplicant = computeRecommendationsByApplicant()
  const getRecs = applicantId => {
    if (applicantId in recsByApplicant) {
      return recsByApplicant[applicantId]
    } else {
      return []
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexFlow: 'row wrap',
      columnGap: '5px',
      padding: '10px'
    }}>
      {courses.map(course =>
        <div
          key={course.id}
          style={{
            paddingLeft: '15px',
            paddingRight: '15px',
            paddingBottom: '100px',
            width: '200px'
          }}
        >
          <CourseRoster number={course.id} style={{
            flexGrow: 0,
            flexShrink: 0,
            height: '100%',
          }}>
            {getCourseRoster(course.id).map(applicant => (
              <div key={applicant.id}>
                <Candidate
                  onChange={(applicantId, status) => {
                    updateServer(course.id, applicantId, status)
                  }}
                  key={applicant.id}
                  id={applicant.id}
                  name={applicant.name}
                  initialStatus={applicant.status}
                  scores={getRecs(applicant.id)}
                />
              </div>
            ))}

          </CourseRoster>
        </div>
      )}
    </div>
  )



}


const App = () => {

  const [courses, setCourses] = useState(null)
  const [recommenders, setRecommenders] = useState([])
  const [mode, setMode] = useState(0)
  const [modeHover, setModeHover] = useState(null)

  useEffect(() => {
    axios
      .get(`${server}/courses`)
      .then(response => {
        let courseIds = response.data.map(datum => datum.id)
        courseIds.sort((x, y) => y - x)
        setCourses(courseIds)
        })
    axios
      .get(`${server}/recommendations`)
      .then(response => {
        let unsorted = Object.keys(response.data)
        unsorted.sort()
        setRecommenders(unsorted)
      })
  }, [])


  const makeTitle = () => {
    return (
      <img src="okta.png" alt="okTA!" />
    )
  }

  const makeOptions = () => {
    return (
      <div>
        <div
          onClick={() => setMode(0)}
          onMouseEnter={() => setModeHover(0)}
          onMouseLeave={() => setModeHover(null)}
          style={{
            textAlign: "left",
            fontFamily: "Optima",
            fontSize: "100px",
            color: (mode == 0 && modeHover === null) || modeHover == 0 ? "darkgreen" : "lightgray",
            fontWeight: (mode == 0 && (modeHover === null || modeHover === 0)) ? "bold" : "normal",
          }}>
          refer
        </div>
        <div
          onClick={() => setMode(1)}
          onMouseEnter={() => setModeHover(1)}
          onMouseLeave={() => setModeHover(null)}
          style={{
            textAlign: "left",
            fontFamily: "Optima",
            fontSize: "100px",
            color: (mode == 1 && modeHover === null) || modeHover == 1 ? "darkgreen" : "lightgray",
            fontWeight: (mode == 1 && (modeHover === null || modeHover === 1)) ? "bold" : "normal",
          }}>
          prefer
        </div>
        <div
          onClick={() => setMode(2)}
          onMouseEnter={() => setModeHover(2)}
          onMouseLeave={() => setModeHover(null)}
          style={{
            textAlign: "left",
            fontFamily: "Optima",
            fontSize: "100px",
            color: (mode == 2 && modeHover === null) || modeHover == 2 ? "darkgreen" : "lightgray",
            fontWeight: (mode == 2 && (modeHover === null || modeHover === 2)) ? "bold" : "normal",
          }}>
          verify
        </div>
      </div>

    )
  }

  const renderMainModule = () => {
    if (mode == 0) {
      return (
        recommenders ?
          recommenders.map(recommender =>
            <div key={recommender}>
              <hr />
              <OktaRefer recommender={recommender} />
            </div>
          ) : null
      )
    } else if (mode == 1) {
      return (
        courses ? courses.map(course =>
          <div key={course}>
            <hr />
            <OktaPrefer course={course} />
          </div>
        ) : null
      )
    } else if (mode == 2) {
      return (
        <OktaVerify />
      )
    } else {
      return null
    }
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        flexFlow: 'row nowrap',
      }}>
        {makeTitle()}
        {makeOptions()}
      </div>
      <div>
        {renderMainModule()}
      </div>
      <hr />
    </div>
  )
}

export default App 